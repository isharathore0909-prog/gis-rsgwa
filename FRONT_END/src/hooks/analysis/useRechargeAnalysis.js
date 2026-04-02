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
    const [rechargeLoading, setRechargeLoading] = useState(true);
    const [apiRetryCount, setApiRetryCount] = useState(0);
    const lastRechargeParams = useRef({ level: analysisLevel, name: analysisName });

    useEffect(() => {
        let ignore = false;
        if (!isRechargeStructure) {
            setRechargeStats(null);
            return;
        }

        const fetchRechargeStats = async () => {
            if (!rajasthanId) {
                setRechargeLoading(false);
                return;
            }
            setRechargeLoading(true);
            try {
                const params = {};
                if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
                else if (displayRegion && displayRegion !== 'Rajasthan') params.district = displayRegion;

                if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
                else if (displayBlock) params.block = displayBlock;

                if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
                else if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

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
                    // If backend returned connection error, retry after a delay
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
                if (!ignore) setRechargeLoading(false);
            }
        };

        fetchRechargeStats();
        return () => { ignore = true; };
    }, [isRechargeStructure, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.district_id, globalFilters?.block_id, globalFilters?.gp_id, globalFilters?.village_id, rajasthanId, apiRetryCount]);

    return {
        rechargeStats,
        rechargeLoading
    };
};
