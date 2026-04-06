import { useState, useEffect, useRef } from 'react';
import api from '../../api';

/**
 * Custom hook for fetching spatial layers (Groundwater Zones, etc.) from the backend API
 * with spatial filtering support.
 */
export const useSpatialLayerData = (layerType, isActive, filters) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const lastParams = useRef('');

    useEffect(() => {
        let ignore = false;

        if (!isActive || !layerType) {
            setData(null);
            setLoading(false);
            lastParams.current = '';
            return;
        }

        const fetchData = async () => {
            const params = {
                layer_type: layerType,
                district: filters?.district,
                block: filters?.block,
                grampanchayat: filters?.gramPanchayat,
                gp: filters?.gp
            };

            // Stringify params for stable check
            const currentParamsKey = JSON.stringify(params);
            if (lastParams.current === currentParamsKey) {
                return;
            }
            lastParams.current = currentParamsKey;

            setData(null); // Clear previous data immediately
            setLoading(true);
            try {
                // Use getIntersect if we have location filters, otherwise getLayers
                const hasLocationFilter = filters?.district || filters?.block || filters?.gramPanchayat;
                const response = hasLocationFilter
                    ? await api.spatialLayer.getIntersect(params)
                    : await api.spatialLayer.getLayers(params);

                if (!ignore) {
                    setData(response);
                    setError(null);
                }
            } catch (err) {
                if (!ignore) {
                    console.error(`[useSpatialLayerData] Error fetching ${layerType}:`, err);
                    setError(err);
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [layerType, isActive, filters?.district, filters?.block, filters?.gramPanchayat]);

    return { data, loading, error };
};
