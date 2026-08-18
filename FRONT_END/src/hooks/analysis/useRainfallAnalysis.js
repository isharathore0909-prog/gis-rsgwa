import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';

/**
 * useRainfallAnalysis
 *
 * mode: 'idle'    — stop in-flight requests; retain existing state
 * mode: 'preview' — fetch statistics + distribution (needed for preview card)
 * mode: 'detail'  — preview requests + summary (monthly/yearly trend)
 *
 * Data is cleared only when the filter signature changes, not on mode transitions.
 */
export const useRainfallAnalysis = ({
    // Legacy boolean kept for callers that haven't migrated yet
    isRainfall,
    // Explicit mode takes priority when provided
    mode: modeProp,
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
    // Resolve effective mode
    const mode = modeProp ?? (isRainfall ? 'detail' : 'idle');

    // ── State ────────────────────────────────────────────────────────────────
    // Preview-tier (retained across mode transitions, cleared on filter-sig change)
    const [rainfallStatsData, setRainfallStatsData] = useState(null);
    const [rainfallDistributionData, setRainfallDistributionData] = useState(null);
    const [overallDistribution, setOverallDistribution] = useState(null);
    const [intersectingStationIds, setIntersectingStationIds] = useState([]);

    // Detail-tier (cleared when mode drops from detail back to preview/idle)
    const [rainfallSummaryData, setRainfallSummaryData] = useState([]);

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

    // ── Base params for backend requests ─────────────────────────────────────
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

    // ── Filter signature ─────────────────────────────────────────────────────
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
        start: globalFilters?.dataRangeStart,
        end: globalFilters?.dataRangeEnd,
        timestep: globalFilters?.timestep,
        dataSource: rainfallDataSource,
    });
    const lastFilterSig = useRef(filterSig);
    const hasAttemptedFetch = useRef(false);

    // Clear ALL state when filter signature changes
    useEffect(() => {
        if (filterSig !== lastFilterSig.current) {
            lastFilterSig.current = filterSig;
            hasAttemptedFetch.current = false;
            setRainfallStatsData(null);
            setRainfallDistributionData(null);
            setOverallDistribution(null);
            setIntersectingStationIds([]);
            setRainfallSummaryData([]);
            setRainfallError(null);
        }
    }, [filterSig]);

    // Clear detail-tier when mode drops out of detail (but filter sig unchanged)
    const prevMode = useRef(mode);
    useEffect(() => {
        if (prevMode.current === 'detail' && mode !== 'detail') {
            setRainfallSummaryData([]);
        }
        prevMode.current = mode;
    }, [mode]);

    const shouldFetchPreview = mode === 'preview' || mode === 'detail';
    const shouldFetchDetail  = mode === 'detail';

    const isPendingInitialFetch = shouldFetchPreview && !hasAttemptedFetch.current;
    const rainfallLoading = isFetching || isPendingInitialFetch;

    // ── Effect 1: Statistics — fires in preview and detail ───────────────────
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetchPreview) {
            // idle — stop spinner, do NOT clear data
            setIsFetching(false);
            return () => controller.abort();
        }

        const fetchStats = async () => {
            // Debounce slightly for UI smoothness on re-renders
            if (hasAttemptedFetch.current) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            if (signal.aborted) return;

            hasAttemptedFetch.current = true;
            setIsFetching(true);

            try {
                const stats = await api.rainfall.getStationStatistics(baseParams, signal);

                if (!signal.aborted) {
                    setRainfallStatsData(stats);
                    const ids = stats.station_ids || [];
                    setIntersectingStationIds(ids);
                    setRainfallError(null);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    console.error('Rainfall stats fetch failed:', err);
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

        fetchStats();
        return () => controller.abort();
    }, [shouldFetchPreview, filterSig, apiRetryCount]);

    // ── Effect 2: Distribution — fires in preview and detail, chained on stats ──
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetchPreview || !rainfallStatsData) return;

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
                        setOverallDistribution({
                            ...data.overall,
                            departure: rainfallStatsData?.departure || 0,
                            normal_avg: data.overall.normal_used || 600,
                        });
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                console.error('Distribution fetch failed:', err);
            } finally {
                if (!signal.aborted) setIsDistFetching(false);
            }
        };

        fetchDistribution();
        return () => controller.abort();
    }, [
        shouldFetchPreview, rainfallDataSource, filterSig,
        rainfallStatsData?.avg_station_total
    ]);

    // ── Effect 3: Summary (monthly/yearly trend) — detail only ───────────────
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetchDetail) {
            // preview or idle — cancel any in-flight summary request; data cleared by mode tracker above
            return () => controller.abort();
        }

        const fetchSummary = async () => {
            try {
                const summary = await api.rainfall.getStationSummary(
                    { ...baseParams, timestep: globalFilters?.timestep || 'monthly' },
                    signal
                );
                if (!signal.aborted) {
                    const summaryData = Array.isArray(summary) ? summary : (summary?.data || []);
                    const overallAvg = summary?.overall_average || null;
                    setRainfallSummaryData(summaryData);
                    // Patch overall_average into stats if present
                    if (overallAvg && rainfallStatsData) {
                        setRainfallStatsData(prev => prev ? { ...prev, overall_average: overallAvg } : prev);
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                console.error('Rainfall summary fetch failed:', err);
            }
        };

        fetchSummary();
        return () => controller.abort();
    }, [shouldFetchDetail, filterSig, globalFilters?.timestep]);

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
