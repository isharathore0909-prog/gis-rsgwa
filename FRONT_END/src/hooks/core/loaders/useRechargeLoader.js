import { useState, useEffect, useRef } from 'react';
import api from '../../../api';
import { notificationService } from '../../../services/notificationService';

export const useRechargeLoader = (filters) => {
    const [rechargeRecords, setRechargeRecords] = useState([]);
    const [rechargeLoading, setRechargeLoading] = useState(false);
    const lastParamsRef = useRef('');

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const isRechargeLayer = filters?.type === 'Recharge Structure' || filters?.type === 'Water Resources';
        if (!isRechargeLayer) {
            setRechargeLoading(false);
            return () => controller.abort();
        }

        const fetchRecharge = async () => {
            const params = {
                district_id: filters.district_id,
                district: filters.district,
                block_id: filters.block_id,
                block: filters.block,
                gp_id: filters.gp_id,
                grampanchayat: filters.gramPanchayat,
                village_id: filters.village_id,
                village_name: filters.village,
                detailed: 'true'
            };

            // Skip if parameters haven't changed
            const paramsKey = JSON.stringify(params);
            if (paramsKey === lastParamsRef.current) return;
            lastParamsRef.current = paramsKey;

            setRechargeLoading(true);
            const timeoutId = setTimeout(() => {
                if (!signal.aborted) setRechargeLoading(false);
            }, 15000);

            try {
                const data = await api.rechargeStructure.getRecords(params, signal);
                if (!signal.aborted) {
                    setRechargeRecords(data.results || data || []);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    setRechargeRecords([]);
                    notificationService.error(`Failed to fetch recharge structures: ${err.message}`);
                }
            } finally {
                if (!signal.aborted) setRechargeLoading(false);
                clearTimeout(timeoutId);
            }
        };
        fetchRecharge();
        return () => controller.abort();
    }, [
        filters?.type, filters?.district, filters?.district_id,
        filters?.block, filters?.block_id,
        filters?.gramPanchayat, filters?.gp_id,
        filters?.village, filters?.village_id
    ]);

    return { rechargeRecords, setRechargeRecords, rechargeLoading, setRechargeLoading };
};
