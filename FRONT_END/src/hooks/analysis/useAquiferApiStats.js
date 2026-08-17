import { useState, useEffect, useRef } from 'react';
import api from '../../api';
import { notificationService } from '../../services/notificationService';

export const useAquiferApiStats = ({
    activeMode,
    isWellInventory,
    globalFilters,
    displayRegion,
    displayBlock,
    rajasthanId,
    paramsChanged,
    hasAttemptedStatsFetch,
    analysisLevel
}) => {
    const [aquiferStats, setAquiferStats] = useState(null);
    const [isFetchingStats, setIsFetchingStats] = useState(false);
    const [aquiferRecords, setAquiferRecords] = useState([]);
    const [yearlyTrends, setYearlyTrends] = useState(null);
    const [aquiferYearData, setAquiferYearData] = useState(null);
    const [apiRetryCount, setApiRetryCount] = useState(0);
    const [error, setError] = useState(null);

    const aquiferLoading = isFetchingStats || paramsChanged || (activeMode && !hasAttemptedStatsFetch.current);

    useEffect(() => {
        if (activeMode && paramsChanged) {
            setAquiferStats(null);
            setAquiferRecords([]);
            setYearlyTrends(null);
            setAquiferYearData(null);
            setError(null);
        }
    }, [activeMode, paramsChanged]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!activeMode) {
            hasAttemptedStatsFetch.current = false;
            setIsFetchingStats(false);
            return;
        }

        const fetchAquiferData = async () => {
            if (!rajasthanId) {
                return;
            }
            hasAttemptedStatsFetch.current = true;
            setIsFetchingStats(true);
            setError(null);
            try {
                const params = { year: globalFilters?.year || 2024 };
                if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
                else if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;

                if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
                else if (displayBlock) params.block = displayBlock;

                if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
                else if (globalFilters?.gramPanchayat) params.gp_id = globalFilters.gramPanchayat;

                if (globalFilters?.village_id) params.village_id = globalFilters.village_id;
                else if (globalFilters?.village) params.village_name = globalFilters.village;

                // 1. Fetch Main Statistics
                const statsPromise = api.aquifer.getStatistics(params, signal);

                // 2. Fetch Yearly Trends and Detailed Records if needed
                let extraPromises = [Promise.resolve(null), Promise.resolve([]), Promise.resolve(null)];
                if (isWellInventory) {
                    const yearlyParams = { ...params };
                    extraPromises = [
                        api.aquifer.getYearlyStatistics(yearlyParams, signal).catch(() => null),
                        api.aquifer.getRecords({ ...params, detailed: 'true' }, signal).catch(() => []),
                        api.aquifer.getYearData({ ...params }, signal).catch(() => null)
                    ];
                }

                const [stats, trends, records, yearData] = await Promise.all([
                    statsPromise,
                    ...extraPromises
                ]);

                if (!signal.aborted) {
                    setAquiferStats(stats);
                    if (isWellInventory) {
                        setYearlyTrends(trends);
                        setAquiferRecords(records?.results || records || []);
                        setAquiferYearData(yearData);
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'CanceledError') return;
                if (!signal.aborted) {
                    console.error('Error fetching aquifer data:', error);
                    if (apiRetryCount < 3 && (!error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
                        setTimeout(() => { if (!signal.aborted) setApiRetryCount(prev => prev + 1); }, 5000);
                    } else {
                        setError(error.message);
                        notificationService.error(`Aquifer API Error: ${error.message}`);
                    }
                }
            } finally {
                if (!signal.aborted) setIsFetchingStats(false);
            }
        };

        fetchAquiferData();
        return () => controller.abort();
    }, [activeMode, isWellInventory, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, globalFilters?.year, rajasthanId, apiRetryCount, hasAttemptedStatsFetch]);

    return {
        aquiferStats,
        aquiferLoading,
        aquiferRecords,
        yearlyTrends,
        aquiferYearData,
        error
    };
};
