import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';

export const useRainfallAnalysis = ({
    isRainfall,
    globalFilters,
    displayRegion,
    displayBlock,
    clickedLocation,
    neighbor,
    selectedBoundary,
    blockData,
    rainfallStations,
    dynamicBoundaries = [],
    rainfallDataSource = 'station',
    parentRainfallLoading,
    rajasthanId,
    analysisLevel
}) => {
    const [rainfallStatsData, setRainfallStatsData] = useState(null);
    const [rainfallSummaryData, setRainfallSummaryData] = useState([]);
    const [rainfallDistributionData, setRainfallDistributionData] = useState(null);
    const [overallDistribution, setOverallDistribution] = useState(null);
    const [intersectingStationIds, setIntersectingStationIds] = useState([]);
    const [rainfallError, setRainfallError] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isDistFetching, setIsDistFetching] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    const toTitleCase = (str) => {
        if (!str) return str;
        const strValue = typeof str === 'string' ? str : String(str);
        return strValue.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const isStateOverview = analysisLevel === 'State';

    // Construct params for backend
    const baseParams = useMemo(() => {
        const params = {};
        if (!isStateOverview) {
            if (displayRegion) params.district = toTitleCase(displayRegion);
            if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
            else if (displayBlock) params.block = toTitleCase(displayBlock);
            if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
            else if (globalFilters?.gramPanchayat) params.gram_panchayat = globalFilters.gramPanchayat;
            if (globalFilters?.village_id) params.village_id = globalFilters.village_id;
            else if (globalFilters?.village) params.village = globalFilters.village;
        }

        if (globalFilters?.dataRangeStart) params.start_date = globalFilters.dataRangeStart;
        if (globalFilters?.dataRangeEnd) params.end_date = globalFilters.dataRangeEnd;
        if (globalFilters?.timestep) params.timestep = globalFilters.timestep;
        return params;
    }, [
        isStateOverview, displayRegion, displayBlock,
        globalFilters?.block_id, globalFilters?.gp_id, globalFilters?.gramPanchayat,
        globalFilters?.village_id, globalFilters?.village,
        globalFilters?.dataRangeStart, globalFilters?.dataRangeEnd, globalFilters?.timestep
    ]);

    const activeMode = isRainfall || (!globalFilters?.type || globalFilters?.type === '');

    const currentParamsKey = `${JSON.stringify(baseParams)}-${activeMode}`;
    const lastParamsRef = useRef(currentParamsKey);
    const hasAttemptedFetch = useRef(false);

    const paramsChanged = activeMode && lastParamsRef.current !== currentParamsKey;
    const isPendingInitialFetch = activeMode && !hasAttemptedFetch.current;
    const rainfallLoading = isFetching || paramsChanged || isPendingInitialFetch;

    useEffect(() => {
        if (activeMode && paramsChanged) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setRainfallDistributionData(null);
            setIntersectingStationIds([]);
            hasAttemptedFetch.current = false;
            lastParamsRef.current = currentParamsKey;
        }
    }, [isRainfall, paramsChanged, currentParamsKey]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!activeMode) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setIntersectingStationIds([]);
            setRainfallError(null);
            hasAttemptedFetch.current = false;
            setIsFetching(false);
            return;
        }

        const fetchRainfallStats = async () => {
            // Debounce slightly for UI smoothness
            if (hasAttemptedFetch.current) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            if (signal.aborted) return;

            hasAttemptedFetch.current = true;
            setIsFetching(true);

            try {
                // The backend now handles the spatial selection of stations 
                // based on the administrative parameters (district, block, gp)
                const [stats, summary] = await Promise.all([
                    api.rainfall.getStationStatistics(baseParams, signal),
                    api.rainfall.getStationSummary({ ...baseParams, timestep: globalFilters?.timestep || 'monthly' }, signal)
                ]);

                if (!signal.aborted) {
                    const summaryData = Array.isArray(summary) ? summary : (summary?.data || []);
                    const overallAvg = summary?.overall_average || null;

                    setRainfallStatsData(stats);
                    setRainfallSummaryData(summaryData);
                    // Add overall_average to stats for easier access if it came with summary
                    if (overallAvg && stats) stats.overall_average = overallAvg;

                    // Extract station IDs from results if returned by backend
                    const ids = stats.station_ids || [];
                    setIntersectingStationIds(ids);
                    setRainfallError(null);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    console.error('Rainfall fetch failed:', err);
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK')) {
                        setTimeout(() => {
                            if (!signal.aborted) setApiRetryCount(prev => prev + 1);
                        }, 5000);
                    } else {
                        setRainfallError(err.message);
                    }
                }
            } finally {
                if (!signal.aborted) setIsFetching(false);
            }
        };

        fetchRainfallStats();

        return () => controller.abort();
    }, [activeMode, currentParamsKey, apiRetryCount]);

    // Fetch sub-unit distribution data using optimized backend endpoint
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!activeMode || !rainfallStatsData) return;

        const fetchDistribution = async () => {
            setIsDistFetching(true);
            try {
                const getDistMethod = rainfallDataSource === 'station'
                    ? api.rainfall.getStationDistribution
                    : api.rainfall.getDistribution;

                // Keep the request stable so both the browser and backend caches can serve
                // repeated views of the same geographic selection.
                const distParams = { ...baseParams };
                if (rainfallStatsData?.avg_station_total) {
                    distParams.normal = rainfallStatsData.avg_station_total;
                }

                const data = await getDistMethod(distParams, signal);
                if (!signal.aborted && data) {
                    setRainfallDistributionData(data.processed || []);
                    if (data.overall) {
                        // Backend returns percentage-based distribution
                        setOverallDistribution({
                            ...data.overall,
                            departure: rainfallStatsData?.departure || 0,
                            normal_avg: data.overall.normal_used || 600,
                        });
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                console.error("Distribution fetch failed:", err);
            } finally {
                if (!signal.aborted) setIsDistFetching(false);
            }
        };

        fetchDistribution();
        return () => controller.abort();
    }, [
        activeMode, rainfallDataSource, currentParamsKey,
        rainfallStatsData?.avg_station_total
    ]);

    return {
        rainfallStatsData,
        rainfallSummaryData,
        rainfallDistributionData,
        overallDistribution,
        intersectingStationIds,
        rainfallLoading: parentRainfallLoading || rainfallLoading,
        distLoading: isDistFetching,
        rainfallError
    };
};
