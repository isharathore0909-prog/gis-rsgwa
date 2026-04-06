import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';

export const useGWREAnalysis = ({
    isGWRE,
    globalFilters,
    displayRegion,
    displayBlock,
    rajasthanId,
    analysisLevel
}) => {
    const [gwreStats, setGwreStats] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    const activeMode = isGWRE || !globalFilters?.type || globalFilters?.type === 'Ground Water Resource Estimation';

    // Keep track of previous parameters to conditionally display loading state synchronously
    const lastParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, type: globalFilters?.type });
    const hasAttemptedFetch = useRef(false);

    const paramsChanged = activeMode && (
        lastParams.current.displayRegion !== displayRegion ||
        lastParams.current.displayBlock !== displayBlock ||
        lastParams.current.gp !== globalFilters?.gramPanchayat ||
        lastParams.current.type !== globalFilters?.type
    );

    // Initial load block, or actual fetch progress, or synchronous transition catching.
    // If active but we haven't even attempted to fetch yet (e.g. waiting for rajasthanId), we are loading.
    const isPendingInitialFetch = activeMode && !hasAttemptedFetch.current;
    const gwreLoading = isFetching || paramsChanged || isPendingInitialFetch;

    console.log('[DEBUG useGWRE] activeMode:', activeMode, 'isFetching:', isFetching, 'paramsChanged:', paramsChanged, 'pendingInit:', isPendingInitialFetch, 'gwreLoading:', gwreLoading);

    useEffect(() => {
        let ignore = false;

        lastParams.current = {
            displayRegion,
            displayBlock,
            gp: globalFilters?.gramPanchayat,
            type: globalFilters?.type
        };

        if (!activeMode) {
            setIsFetching(false);
            hasAttemptedFetch.current = false;
            return;
        }

        const fetchGWRE = async () => {
            if (!rajasthanId) {
                // Keep showing loading until we have rajasthanId and start fetching
                return;
            }
            hasAttemptedFetch.current = true;
            setIsFetching(true);
            try {
                const params = { layer_type: 'groundwater_zone' };
                if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const data = await api.spatialLayer.getStatistics(params);
                if (!ignore) {
                    setGwreStats(prev => {
                        const nextStr = JSON.stringify(data);
                        if (JSON.stringify(prev) === nextStr) return prev;
                        return data;
                    });
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch GWRE stats:', err);
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!ignore) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setGwreStats(null);
                    }
                }
            } finally {
                if (!ignore) setIsFetching(false);
            }
        };

        fetchGWRE();
        return () => { ignore = true; };
    }, [activeMode, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.type, rajasthanId, apiRetryCount, analysisLevel]);

    const pieData = useMemo(() => {
        if (gwreStats?.distribution && gwreStats.distribution.length > 0) {
            const colors = {
                'Over Exploited': '#e63946',
                'Saline': '#457b9d',
                'Critical': '#f4a261',
                'Semi Critical': '#e9c46a',
                'Safe': '#2a9d8f'
            };
            return gwreStats.distribution.map(d => ({
                name: d.name,
                value: parseFloat(d.count) || 0,
                area: parseFloat(d.area) || 0,
                color: colors[d.name] || '#e2e8f0'
            }));
        }
        return [];
    }, [gwreStats]);

    const totalBlocks = useMemo(() => {
        return gwreStats?.total_count || pieData.reduce((sum, item) => sum + (item.value || 0), 0);
    }, [gwreStats, pieData]);

    const [gwreFeatures, setGwreFeatures] = useState(null);

    // Fetch GWRE Features for Attribute Table
    useEffect(() => {
        let ignore = false;
        if (!activeMode) {
            setGwreFeatures(null);
            return;
        }

        const fetchFeatures = async () => {
            try {
                const params = { layer_type: 'groundwater_zone' };
                if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const hasLocationFilter = params.district || params.block || params.grampanchayat;
                const data = hasLocationFilter
                    ? await api.spatialLayer.getIntersect(params)
                    : await api.spatialLayer.getLayers(params);

                if (!ignore) {
                    setGwreFeatures(data);
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch GWRE features:', err);
                }
            }
        };

        fetchFeatures();
        return () => { ignore = true; };
    }, [activeMode, displayRegion, displayBlock, globalFilters?.gramPanchayat, analysisLevel]);

    return {
        gwreStats,
        gwreFeatures,
        gwreLoading,
        pieData,
        totalBlocks
    };
};
