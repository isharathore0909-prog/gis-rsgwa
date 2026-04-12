import { useState, useEffect, useRef } from 'react';
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
    const [intersectingStationIds, setIntersectingStationIds] = useState([]);
    const [rainfallError, setRainfallError] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    const toTitleCase = (str) => {
        if (!str) return str;
        const strValue = typeof str === 'string' ? str : String(str);
        return strValue.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const isStateOverview = analysisLevel === 'State';

    // Construct params for backend
    const baseParams = {};
    if (!isStateOverview) {
        if (displayRegion) baseParams.district = toTitleCase(displayRegion);
        if (globalFilters?.block_id) baseParams.block_id = globalFilters.block_id;
        else if (displayBlock) baseParams.block = toTitleCase(displayBlock);
        if (globalFilters?.gp_id) baseParams.gp_id = globalFilters.gp_id;
        else if (globalFilters?.gramPanchayat) baseParams.gram_panchayat = globalFilters.gramPanchayat;
        if (globalFilters?.village_id) baseParams.village_id = globalFilters.village_id;
        else if (globalFilters?.village) baseParams.village = globalFilters.village;
    }

    if (globalFilters?.dataRangeStart) baseParams.start_date = globalFilters.dataRangeStart;
    if (globalFilters?.dataRangeEnd) baseParams.end_date = globalFilters.dataRangeEnd;
    if (globalFilters?.timestep) baseParams.timestep = globalFilters.timestep;

    const currentParamsKey = `${JSON.stringify(baseParams)}-${isRainfall}`;
    const lastParamsRef = useRef(currentParamsKey);
    const hasAttemptedFetch = useRef(false);

    const paramsChanged = isRainfall && lastParamsRef.current !== currentParamsKey;
    const isPendingInitialFetch = isRainfall && !hasAttemptedFetch.current;
    const rainfallLoading = isFetching || paramsChanged || isPendingInitialFetch;

    useEffect(() => {
        if (isRainfall && paramsChanged) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setIntersectingStationIds([]);
            hasAttemptedFetch.current = false;
            lastParamsRef.current = currentParamsKey;
        }
    }, [isRainfall, paramsChanged, currentParamsKey]);

    useEffect(() => {
        let ignore = false;
        let controller = new AbortController();

        if (!isRainfall) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setIntersectingStationIds([]);
            setRainfallError(null);
            hasAttemptedFetch.current = false;
            setIsFetching(false);
            return;
        }

        const fetchRainfallStats = async () => {
            if (!rajasthanId) return;

            // Debounce slightly for UI smoothness
            if (hasAttemptedFetch.current) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            if (ignore) return;

            hasAttemptedFetch.current = true;
            setIsFetching(true);

            try {
                // The backend now handles the spatial selection of stations 
                // based on the administrative parameters (district, block, gp)
                const [stats, summary] = await Promise.all([
                    api.rainfall.getStationStatistics(baseParams),
                    api.rainfall.getStationSummary({ ...baseParams, timestep: globalFilters?.timestep || 'monthly' })
                ]);

                if (!ignore) {
                    setRainfallStatsData(stats);
                    setRainfallSummaryData(summary || []);
                    // Extract station IDs from results if returned by backend
                    const ids = stats.station_ids || [];
                    setIntersectingStationIds(ids);
                    setRainfallError(null);
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Rainfall fetch failed:', err);
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK')) {
                        setTimeout(() => {
                            if (!ignore) setApiRetryCount(prev => prev + 1);
                        }, 5000);
                    } else {
                        setRainfallError(err.message);
                    }
                }
            } finally {
                if (!ignore) setIsFetching(false);
            }
        };

        fetchRainfallStats();

        return () => {
            ignore = true;
            controller.abort();
        };
    }, [
        isRainfall, baseParams.district, baseParams.block, baseParams.block_id,
        baseParams.gram_panchayat, baseParams.gp_id,
        baseParams.village, baseParams.village_id,
        baseParams.start_date, baseParams.end_date, baseParams.timestep,
        rajasthanId, apiRetryCount, analysisLevel
    ]);

    return {
        rainfallStatsData,
        rainfallSummaryData,
        intersectingStationIds,
        rainfallLoading: parentRainfallLoading || rainfallLoading,
        rainfallError
    };
};
