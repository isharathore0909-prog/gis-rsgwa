import { useState, useEffect, useRef } from 'react';
import api from '../../api';

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
    const [apiRetryCount, setApiRetryCount] = useState(0);

    const aquiferLoading = isFetchingStats || paramsChanged || (activeMode && !hasAttemptedStatsFetch.current);

    useEffect(() => {
        if (activeMode && paramsChanged) {
            setAquiferStats(null);
            setAquiferRecords([]);
            setYearlyTrends(null);
        }
    }, [activeMode, paramsChanged]);

    useEffect(() => {
        let ignore = false;
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
                const statsPromise = api.aquifer.getStatistics(params);

                // 2. Fetch Yearly Trends and Detailed Records if needed
                let extraPromises = [Promise.resolve(null), Promise.resolve([])];
                if (isWellInventory || true) { // Force fetching for dashboard support
                    const yearlyParams = { ...params };
                    extraPromises = [
                        api.aquifer.getYearlyStatistics(yearlyParams).catch(() => null),
                        api.aquifer.getRecords({ ...params, detailed: 'true' }).catch(() => [])
                    ];
                }

                const [stats, trends, records] = await Promise.all([
                    statsPromise,
                    ...extraPromises
                ]);

                if (!ignore) {
                    setAquiferStats(stats);
                    if (isWellInventory || true) {
                        setYearlyTrends(trends);
                        setAquiferRecords(records);
                    }
                }
            } catch (error) {
                if (!ignore) {
                    console.error('Error fetching aquifer data:', error);
                    if (apiRetryCount < 3 && (!error.response || error.code === 'ERR_NETWORK')) {
                        setTimeout(() => { if (!ignore) setApiRetryCount(prev => prev + 1); }, 5000);
                    }
                }
            } finally {
                if (!ignore) setIsFetchingStats(false);
            }
        };

        fetchAquiferData();
        return () => { ignore = true; };
    }, [activeMode, isWellInventory, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, globalFilters?.year, rajasthanId, apiRetryCount, hasAttemptedStatsFetch]);

    return {
        aquiferStats,
        aquiferLoading,
        aquiferRecords,
        yearlyTrends
    };
};
