import { useState, useEffect } from 'react';
import api from '../../api';

/**
 * Hook to fetch statistics and optionally features for generic spatial layers
 */
export const useSpatialLayerStats = (isActive, layerType, filters = {}, includeFeatures = false) => {
    const [stats, setStats] = useState(null);
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!isActive || !layerType) {
            setStats(null);
            setLoading(false);
            return;
        }

        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { layer_type: layerType };

                if (filters.district) params.district = filters.district;
                if (filters.block) params.block = filters.block;
                if (filters.gramPanchayat) params.grampanchayat = filters.gramPanchayat;
                if (filters.village) params.village = filters.village;

                const [statsData, featuresData] = await Promise.all([
                    api.spatialLayer.getStatistics(params, signal),
                    includeFeatures
                        ? api.spatialLayer.getIntersect(params, signal).catch(() => ({ type: 'FeatureCollection', features: [] }))
                        : Promise.resolve(null)
                ]);

                if (!signal.aborted) {
                    setStats(statsData);
                    if (featuresData) {
                        setFeatures(featuresData.features || []);
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                console.error(`[useSpatialLayerStats] Failed to fetch stats for ${layerType}:`, err);
                if (!signal.aborted) {
                    setError(err);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchStats();

        return () => controller.abort();
    }, [isActive, layerType, JSON.stringify(filters), includeFeatures]);

    return { stats, features, loading, error };
};
