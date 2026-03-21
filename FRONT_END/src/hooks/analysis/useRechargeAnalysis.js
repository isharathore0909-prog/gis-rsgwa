import { useState, useEffect, useRef } from 'react';
import api from '../../api';

export const useRechargeAnalysis = ({
    isRechargeStructure,
    analysisLevel,
    analysisName,
    globalFilters,
    displayRegion,
    displayBlock
}) => {
    const [rechargeStats, setRechargeStats] = useState(null);
    const [rechargeLoading, setRechargeLoading] = useState(true);
    const lastRechargeParams = useRef({ level: analysisLevel, name: analysisName });

    useEffect(() => {
        let ignore = false;
        if (!isRechargeStructure) {
            setRechargeStats(null);
            return;
        }

        const fetchRechargeStats = async () => {
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
                if (!ignore) setRechargeStats(data);
            } catch (err) {
                console.error('Failed to fetch recharge stats:', err);
            } finally {
                if (!ignore) setRechargeLoading(false);
            }
        };

        fetchRechargeStats();
        return () => { ignore = true; };
    }, [isRechargeStructure, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.district_id, globalFilters?.block_id, globalFilters?.gp_id, globalFilters?.village_id]);

    return {
        rechargeStats,
        rechargeLoading
    };
};
