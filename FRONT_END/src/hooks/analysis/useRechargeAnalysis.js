import { useState, useEffect, useRef } from 'react';
import api from '../../api';

/**
 * useRechargeAnalysis
 *
 * mode: 'idle'    — stop in-flight requests; retain existing state
 * mode: 'preview' — fetch recharge statistics (total_count for WaterResourcesPreview)
 * mode: 'detail'  — same as preview (recharge stats endpoint is already lightweight)
 *
 * Data is cleared only when the filter signature changes, not on mode transitions.
 */
export const useRechargeAnalysis = ({
    // Legacy boolean kept for callers that haven't migrated yet
    isRechargeStructure,
    // Explicit mode takes priority when provided
    mode: modeProp,
    analysisLevel,
    analysisName,
    globalFilters,
    displayRegion,
    displayBlock,
    rajasthanId
}) => {
    // Resolve effective mode
    const mode = modeProp ?? (isRechargeStructure ? 'detail' : 'idle');

    const [rechargeStats, setRechargeStats] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    // ── Filter signature ─────────────────────────────────────────────────────
    // Data is cleared ONLY when these values change, not when mode changes.
    const filterSig = JSON.stringify({
        state: rajasthanId,
        dist_id: globalFilters?.district_id,
        dist: displayRegion,
        blk_id: globalFilters?.block_id,
        blk: displayBlock,
        gp_id: globalFilters?.gp_id,
        gp: globalFilters?.gramPanchayat
    });
    const lastFilterSig = useRef(filterSig);
    const hasAttemptedFetch = useRef(false);

    const shouldFetch = mode === 'preview' || mode === 'detail';
    const isPendingInitialFetch = shouldFetch && !hasAttemptedFetch.current;
    const rechargeLoading = isFetching || isPendingInitialFetch;

    // Clear state when filter signature changes
    useEffect(() => {
        if (filterSig !== lastFilterSig.current) {
            lastFilterSig.current = filterSig;
            hasAttemptedFetch.current = false;
            setRechargeStats(null);
        }
    }, [filterSig]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetch) {
            // idle — stop spinner, do NOT clear data
            setIsFetching(false);
            return () => controller.abort();
        }

        const fetchRechargeStats = async () => {
            const params = {};
            if (rajasthanId) params.state_id = rajasthanId;

            if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
            else if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;

            if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
            else if (displayBlock) params.block = displayBlock;

            if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
            else if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

            // Wait for rajasthanId before we consider this a valid fetch attempt for the whole state
            if (!rajasthanId && Object.keys(params).length === 0) return;

            hasAttemptedFetch.current = true;
            setIsFetching(true);

            try {
                const data = await api.rechargeStructure.getStatistics(params, signal);
                if (!signal.aborted) {
                    setRechargeStats(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                        return data;
                    });
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    console.error('Failed to fetch recharge stats:', err);
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!signal.aborted) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setRechargeStats(null);
                    }
                }
            } finally {
                if (!signal.aborted) setIsFetching(false);
            }
        };

        fetchRechargeStats();
        return () => controller.abort();
    }, [
        shouldFetch,
        filterSig,
        rajasthanId,
        apiRetryCount
    ]);

    return {
        rechargeStats,
        rechargeLoading
    };
};
