import { useState, useEffect, useRef } from 'react';
import { reprojectGeoJSON } from '../../../utils/reproject';

export const useSecondaryLoader = (filters) => {
    const [canalData, setCanalData] = useState(null);
    const [waterbodyData, setWaterbodyData] = useState(null);
    const [microData, setMicroData] = useState(null);
    const [waterResourcesLoading, setWaterResourcesLoading] = useState(false);
    const [processedBlockData, setProcessedBlockData] = useState(null);
    const originalStaticBlockDataRef = useRef(null);

    // Initial fetch for micro-data and block boundaries
    useEffect(() => {
        let ignore = false;

        const fetchCached = async (url) => {
            if (window._staticCache && window._staticCache[url]) return window._staticCache[url];
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (!window._staticCache) window._staticCache = {};
            window._staticCache[url] = data;
            return data;
        };

        fetchCached('/block_boundary_updated.json').then(data => {
            if (!ignore) {
                const reprojected = data._reprojected || reprojectGeoJSON(data);
                originalStaticBlockDataRef.current = reprojected || data;
                setProcessedBlockData(reprojected || data);
            }
        }).catch(err => console.warn("Failed to load initial block boundaries:", err));

        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        if (filters?.type === 'Water Resources') {
            const fetches = [];
            if (!microData) {
                fetches.push(
                    fetch('/micro.json')
                        .then(res => res.json())
                        .then(data => setMicroData(data || { features: [] }))
                        .catch(() => setMicroData({ features: [] }))
                );
            }
            if (fetches.length > 0) {
                setWaterResourcesLoading(true);
                Promise.all(fetches).finally(() => setWaterResourcesLoading(false));
            } else {
                setWaterResourcesLoading(false);
            }
        } else {
            setWaterResourcesLoading(false);
        }
    }, [filters?.type, microData]);

    return {
        canalData, setCanalData,
        waterbodyData, setWaterbodyData,
        microData, setMicroData,
        waterResourcesLoading, setWaterResourcesLoading,
        processedBlockData, setProcessedBlockData,
        originalStaticBlockDataRef
    };
};
