import { useState, useEffect, useRef } from 'react';
import { reprojectGeoJSON } from '../../../utils/reproject';
import api from '../../../api';

export const useSecondaryLoader = (filters) => {
    const [canalData, setCanalData] = useState(null);
    const [waterbodyData, setWaterbodyData] = useState(null);
    const [microData, setMicroData] = useState(null);
    const [waterResourcesLoading, setWaterResourcesLoading] = useState(false);
    const [processedBlockData, setProcessedBlockData] = useState(null);
    const originalStaticBlockDataRef = useRef(null);

    // Initial state for block boundary data
    useEffect(() => {
        setProcessedBlockData({ type: 'FeatureCollection', features: [] });
    }, []);

    // Dynamically fetch block boundaries when district changes
    useEffect(() => {
        if (!filters?.district) return;
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchBlocks = async () => {
            try {
                const params = { layer: 'block', meta_only: 'false' };
                if (filters.districtId) params.parent_id = filters.districtId;

                const res = await api.location.getBoundaryCollection(params, signal);
                if (res && res.features && !signal.aborted) {
                    const reprojected = reprojectGeoJSON(res);
                    setProcessedBlockData(reprojected || res);
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Error fetching block boundaries:', err);
            }
        };

        fetchBlocks();
        return () => controller.abort();
    }, [filters?.district, filters?.districtId]);

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
