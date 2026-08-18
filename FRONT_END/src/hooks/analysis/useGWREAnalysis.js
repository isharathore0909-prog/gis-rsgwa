import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';
import { GWRE_COLORS } from '../../constants/mapConstants';

/**
 * useGWREAnalysis
 *
 * mode: 'idle'    — stop in-flight requests; retain existing state
 * mode: 'preview' — fetch stats + features (gwreFeatures needed by RajasthanOverviewMap)
 * mode: 'detail'  — same as preview (no extra GWRE-specific detail requests yet)
 *
 * Data is cleared only when the filter signature changes, not on mode transitions.
 */
export const useGWREAnalysis = ({
    // Legacy boolean kept for callers that haven't migrated yet
    isGWRE,
    // Explicit mode takes priority when provided
    mode: modeProp,
    globalFilters,
    displayRegion,
    displayBlock,
    rajasthanId,
    analysisLevel
}) => {
    // Resolve effective mode: if caller passes explicit mode use it,
    // otherwise fall back to the old boolean (detail when true, idle when false).
    const mode = modeProp ?? (isGWRE ? 'detail' : 'idle');

    const [gwreStats, setGwreStats] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    // ── Filter signature ────────────────────────────────────────────────────
    // Data is cleared ONLY when these values change, not when mode changes.
    const filterSig = JSON.stringify({
        district_id: globalFilters?.district_id,
        block_id: globalFilters?.block_id,
        gp_id: globalFilters?.gp_id,
        village_id: globalFilters?.village_id,
        region: displayRegion,
        block: displayBlock,
        gp: globalFilters?.gramPanchayat,
        village: globalFilters?.village,
    });
    const lastFilterSig = useRef(filterSig);
    const hasAttemptedFetch = useRef(false);

    // Clear state when filter signature changes
    useEffect(() => {
        if (filterSig !== lastFilterSig.current) {
            lastFilterSig.current = filterSig;
            hasAttemptedFetch.current = false;
            setGwreStats(null);
            // gwreFeatures cleared via the features fetch effect below
        }
    }, [filterSig]);

    const shouldFetch = mode === 'preview' || mode === 'detail';
    const isPendingInitialFetch = shouldFetch && !hasAttemptedFetch.current;
    const gwreLoading = isFetching || isPendingInitialFetch;

    // ── Stats fetch — fires in preview and detail ───────────────────────────
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetch) {
            // idle — stop spinner but do not clear data
            setIsFetching(false);
            return () => controller.abort();
        }

        const fetchGWRE = async () => {
            hasAttemptedFetch.current = true;
            setIsFetching(true);
            try {
                const params = { layer_type: 'groundwater_zone' };
                if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const data = await api.spatialLayer.getStatistics(params, signal);
                if (!signal.aborted) {
                    setGwreStats(prev => {
                        const nextStr = JSON.stringify(data);
                        if (JSON.stringify(prev) === nextStr) return prev;
                        return data;
                    });
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    console.error('Failed to fetch GWRE stats:', err);
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!signal.aborted) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setGwreStats(null);
                    }
                }
            } finally {
                if (!signal.aborted) setIsFetching(false);
            }
        };

        fetchGWRE();
        return () => controller.abort();
    }, [shouldFetch, filterSig, apiRetryCount, analysisLevel]);

    const pieData = useMemo(() => {
        const categories = [
            'Over Exploited',
            'Safe',
            'Semi Critical',
            'Critical',
            'Saline',
            'Unknown'
        ];

        const colors = {
            'Over Exploited': GWRE_COLORS.over,
            'Safe': GWRE_COLORS.safe,
            'Semi Critical': GWRE_COLORS.semi,
            'Critical': GWRE_COLORS.critical,
            'Saline': GWRE_COLORS.saline,
            'Unknown': '#e2e8f0'
        };

        const distributionMap = {};
        if (gwreStats?.distribution) {
            gwreStats.distribution.forEach(d => {
                distributionMap[d.name] = {
                    count: parseFloat(d.count) || 0,
                    area: parseFloat(d.area) || 0
                };
            });
        }

        return categories.map(name => ({
            name,
            value: distributionMap[name]?.count || 0,
            area: distributionMap[name]?.area || 0,
            color: colors[name] || '#e2e8f0'
        }));
    }, [gwreStats]);

    const totalBlocks = useMemo(() => {
        return gwreStats?.total_count || pieData.reduce((sum, item) => sum + (item.value || 0), 0);
    }, [gwreStats, pieData]);

    const [gwreFeatures, setGwreFeatures] = useState(null);

    // ── Features fetch — preview-tier (RajasthanOverviewMap needs this on dashboard home)
    // Fires in both preview and detail modes.
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetch) {
            // idle — stop in-flight request; do NOT clear gwreFeatures
            return () => controller.abort();
        }

        const fetchFeatures = async () => {
            try {
                const params = {
                    layer_type: 'groundwater_zone',
                    page_size: 500 // Ensure all 301 blocks are fetched for the map
                };
                if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const hasLocationFilter = params.district || params.block || params.grampanchayat;
                const data = hasLocationFilter
                    ? await api.spatialLayer.getIntersect(params, signal)
                    : await api.spatialLayer.getLayers(params, signal);

                if (!signal.aborted) {
                    let normalizedFeatures = [];
                    if (data?.features) {
                        normalizedFeatures = data.features;
                    } else if (data?.results) {
                        normalizedFeatures = data.results.map(item => ({
                            type: 'Feature',
                            id: item.id,
                            geometry: item.geometry,
                            properties: { ...item.properties, name: item.name }
                        }));
                    } else if (Array.isArray(data)) {
                        normalizedFeatures = data.map(item => ({
                            type: 'Feature',
                            id: item.id,
                            geometry: item.geometry,
                            properties: { ...item.properties, name: item.name }
                        }));
                    }
                    setGwreFeatures({ type: 'FeatureCollection', features: normalizedFeatures });
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) console.error('Failed to fetch GWRE features:', err);
            }
        };

        fetchFeatures();
        return () => controller.abort();
    }, [shouldFetch, filterSig, analysisLevel]);

    return {
        gwreStats,
        gwreFeatures,
        gwreLoading,
        pieData,
        totalBlocks
    };
};
