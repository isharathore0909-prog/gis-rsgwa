import { useState, useEffect } from 'react';
import api from '../../../api';

export const useRechargeLoader = (filters) => {
    const [rechargeRecords, setRechargeRecords] = useState([]);
    const [rechargeLoading, setRechargeLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchRecharge = async () => {
            setRechargeLoading(true);
            const timeoutId = setTimeout(() => {
                if (!signal.aborted) setRechargeLoading(false);
            }, 15000);

            try {
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
                const data = await api.rechargeStructure.getRecords(params, signal);
                if (!signal.aborted) {
                    setRechargeRecords(data.results || data || []);
                    setRechargeLoading(false);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                if (!signal.aborted) {
                    setRechargeRecords([]);
                    setRechargeLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchRecharge();
        return () => controller.abort();
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    return { rechargeRecords, setRechargeRecords, rechargeLoading, setRechargeLoading };
};
