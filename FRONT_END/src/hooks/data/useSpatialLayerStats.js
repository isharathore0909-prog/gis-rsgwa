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
        let ignore = false;

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
                    api.spatialLayer.getStatistics(params),
                    includeFeatures
                        ? api.spatialLayer.getIntersect(params).catch(() => ({ type: 'FeatureCollection', features: [] }))
                        : Promise.resolve(null)
                ]);

                if (!ignore) {
                    setStats(statsData);
                    if (featuresData) {
                        setFeatures(featuresData.features || []);
                    }
                }
            } catch (err) {
                console.error(`[useSpatialLayerStats] Failed to fetch stats for ${layerType}:`, err);
                if (!ignore) {
                    setError(err);
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchStats();

        return () => {
            ignore = true;
        };
    }, [isActive, layerType, JSON.stringify(filters), includeFeatures]);

    return { stats, features, loading, error };
};
