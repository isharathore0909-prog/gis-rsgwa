import { useState, useEffect, useRef } from 'react';
import api from '../../api';

export const useRechargeAnalysis = ({
    isRechargeStructure,
    analysisLevel,
    analysisName,
    globalFilters,
    displayRegion,
    displayBlock,
    rajasthanId
}) => {
    const [rechargeStats, setRechargeStats] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    const currentParamsKey = JSON.stringify({
        state: rajasthanId,
        dist_id: globalFilters?.district_id,
        dist: displayRegion,
        blk_id: globalFilters?.block_id,
        blk: displayBlock,
        gp_id: globalFilters?.gp_id,
        gp: globalFilters?.gramPanchayat
    });

    const lastParams = useRef(currentParamsKey);
    const hasAttemptedFetch = useRef(false);

    const paramsChanged = isRechargeStructure && lastParams.current !== currentParamsKey;
    const isPendingInitialFetch = isRechargeStructure && !hasAttemptedFetch.current;

    const rechargeLoading = isFetching || paramsChanged || isPendingInitialFetch;

    useEffect(() => {
        if (isRechargeStructure && paramsChanged) {
            setRechargeStats(null);
            hasAttemptedFetch.current = false;
            lastParams.current = currentParamsKey;
        }
    }, [isRechargeStructure, paramsChanged, currentParamsKey]);

    useEffect(() => {
        let ignore = false;

        // If not the active section, clear stats and stop loading
        if (!isRechargeStructure) {
            setRechargeStats(null);
            hasAttemptedFetch.current = false;
            setIsFetching(false);
            return;
        }

        const fetchRechargeStats = async () => {
            const params = {};
            if (rajasthanId) params.state_id = rajasthanId;

            if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
            else if (displayRegion && displayRegion !== 'Rajasthan') params.district = displayRegion;

            if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
            else if (displayBlock) params.block = displayBlock;

            if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
            else if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

            // Wait for rajasthanId before we consider this a valid fetch attempt for the whole state 
            if (!rajasthanId && Object.keys(params).length === 0) return;

            hasAttemptedFetch.current = true;
            setIsFetching(true);

            try {
                const data = await api.rechargeStructure.getStatistics(params);
                if (!ignore) {
                    setRechargeStats(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                        return data;
                    });
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch recharge stats:', err);
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!ignore) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setRechargeStats(null);
                    }
                }
            } finally {
                if (!ignore) setIsFetching(false);
            }
        };

        fetchRechargeStats();
        return () => { ignore = true; };
    }, [
        isRechargeStructure,
        displayRegion,
        displayBlock,
        globalFilters?.gramPanchayat,
        globalFilters?.village,
        globalFilters?.district_id,
        globalFilters?.block_id,
        globalFilters?.gp_id,
        globalFilters?.village_id,
        rajasthanId,
        apiRetryCount
    ]);

    return {
        rechargeStats,
        rechargeLoading
    };
};
