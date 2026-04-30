import { useState, useEffect } from 'react';
import api from '../../../api';
import { reprojectGeoJSON } from '../../../utils/reproject';

export const useBaseMapLoader = (initRetry, setInitRetry) => {
    const [rajasthanData, setRajasthanData] = useState(null);
    const [rajasthanId, setRajasthanId] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchCached = async (url) => {
            if (window._staticCache && window._staticCache[url]) return window._staticCache[url];
            const res = await fetch(url, { signal });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (!window._staticCache) window._staticCache = {};
            window._staticCache[url] = data;
            return data;
        };

        const initializeMapBase = async () => {
            try {
                const localData = await fetchCached('/district.geojson');
                if (!signal.aborted && localData) {
                    const reprojected = reprojectGeoJSON(localData);
                    setRajasthanData(reprojected || localData);
                }

                if (!rajasthanId) {
                    const states = await api.location.getStates({ name: 'Rajasthan' }, signal);
                    const stateObj = (states.results || states)?.[0];
                    if (stateObj && !signal.aborted) setRajasthanId(stateObj.id);
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('× Error initializing map base:', err);
                if (!signal.aborted && !rajasthanId) {
                    const nextWait = Math.min(Math.pow(2, initRetry) * 2000, 30000);
                    setTimeout(() => {
                        if (!signal.aborted) setInitRetry(prev => prev + 1);
                    }, nextWait);
                }
            }
        };

        initializeMapBase();
        return () => controller.abort();
    }, [initRetry, rajasthanId, setInitRetry]);

    return { rajasthanData, setRajasthanData, rajasthanId, setRajasthanId };
};
