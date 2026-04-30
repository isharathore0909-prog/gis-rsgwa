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

        fetchCached('/block_boundary_updated.json').then(data => {
            if (!signal.aborted) {
                const reprojected = data._reprojected || reprojectGeoJSON(data);
                originalStaticBlockDataRef.current = reprojected || data;
                setProcessedBlockData(reprojected || data);
            }
        }).catch(err => {
            if (err.name === 'AbortError') return;
            console.warn("Failed to load initial block boundaries:", err);
        });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (filters?.type === 'Water Resources') {
            const fetches = [];
            if (!microData) {
                fetches.push(
                    fetch('/micro.json', { signal })
                        .then(res => res.json())
                        .then(data => {
                            if (!signal.aborted) setMicroData(data || { features: [] });
                        })
                        .catch(err => {
                            if (err.name === 'AbortError') return;
                            setMicroData({ features: [] });
                        })
                );
            }
            if (fetches.length > 0) {
                setWaterResourcesLoading(true);
                Promise.all(fetches).finally(() => {
                    if (!signal.aborted) setWaterResourcesLoading(false);
                });
            } else {
                setWaterResourcesLoading(false);
            }
        } else {
            setWaterResourcesLoading(false);
        }

        return () => controller.abort();
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
