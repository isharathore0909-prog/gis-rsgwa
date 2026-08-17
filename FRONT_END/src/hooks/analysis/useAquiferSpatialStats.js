import { useState, useEffect } from 'react';
import api from '../../api';

export const useAquiferSpatialStats = ({
    activeMode,
    displayRegion,
    displayBlock,
    selectedBoundary,
    neighbor,
    paramsChanged,
    hasAttemptedSpatialFetch,
    globalFilters,
    analysisLevel,
    rajasthanId
}) => {
    const [aquiferSpatialStats, setAquiferSpatialStats] = useState(null);
    const [aquiferPolygons, setAquiferPolygons] = useState(null);
    const [isFetchingSpatial, setIsFetchingSpatial] = useState(false);

    const spatialStatsLoading = isFetchingSpatial || paramsChanged || (activeMode && !hasAttemptedSpatialFetch.current);

    useEffect(() => {
        if (activeMode && paramsChanged) {
            setAquiferSpatialStats(null);
            setAquiferPolygons(null);
        }
    }, [activeMode, paramsChanged]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!activeMode) {
            if (!activeMode) {
                setAquiferSpatialStats(null);
                setAquiferPolygons(null);
                hasAttemptedSpatialFetch.current = false;
                setIsFetchingSpatial(false);
            }
            return;
        }

        const fetchSpatialStats = async () => {
            hasAttemptedSpatialFetch.current = true;
            setIsFetchingSpatial(true);
            try {
                // Determine the target parameters for backend statistics
                const params = { layer_type: 'aquifer' };

                if (analysisLevel !== 'State' && displayRegion) {
                    params.district = displayRegion;
                }

                if (displayBlock) {
                    params.block = displayBlock;
                }

                if (globalFilters?.gramPanchayat) {
                    params.grampanchayat = globalFilters.gramPanchayat;
                }

                if (globalFilters?.village) {
                    params.village = globalFilters.village;
                }

                // Call the optimized backend statistics endpoint
                const [stats, features] = await Promise.all([
                    api.spatialLayer.getStatistics(params, signal),
                    // If we have a specific region, also fetch the polygons for map display
                    (params.district || params.block)
                        ? api.spatialLayer.getIntersect(params, signal).catch(() => ({ type: 'FeatureCollection', features: [] }))
                        : Promise.resolve(null)
                ]);

                if (!signal.aborted) {
                    if (stats) {
                        setAquiferSpatialStats(stats);
                    }
                    if (features) {
                        setAquiferPolygons(features);
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                console.error('[AquiferStats] Backend computation failed:', err);
            } finally {
                if (!signal.aborted) setIsFetchingSpatial(false);
            }
        };

        fetchSpatialStats();
        return () => controller.abort();
    }, [activeMode, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, hasAttemptedSpatialFetch, analysisLevel]);

    return {
        aquiferSpatialStats,
        aquiferPolygons,
        spatialStatsLoading
    };
};
