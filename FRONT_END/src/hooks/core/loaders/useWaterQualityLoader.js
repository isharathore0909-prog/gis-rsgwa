import { useState, useEffect } from 'react';
import api from '../../../api';

export const useWaterQualityLoader = (filters, neighbors) => {
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchWQ = async () => {
            setWaterQualityLoading(true);
            const timeoutId = setTimeout(() => {
                if (!signal.aborted) setWaterQualityLoading(false);
            }, 15000);

            try {
                const neighbor = neighbors?.[0];
                const params = {
                    district_id: filters.district_id,
                    district: filters.district || neighbor?.district || neighbor?.properties?.district,
                    block_id: filters.block_id,
                    block: filters.block || neighbor?.block || neighbor?.properties?.block,
                    gp_id: filters.gp_id,
                    grampanchayat: filters.gramPanchayat || neighbor?.grampanchayat || neighbor?.properties?.grampanchayat,
                    village_id: filters.village_id,
                    village_name: filters.village || neighbor?.village || neighbor?.properties?.village,
                    detailed: 'true'
                };

                const response = await api.waterQuality.getRecords(params, signal);
                if (!signal.aborted) {
                    setWaterQualityRecords(response.results || response || []);
                    setWaterQualityLoading(false);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                if (!signal.aborted) {
                    setWaterQualityRecords([]);
                    setWaterQualityLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchWQ();
        return () => controller.abort();
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, neighbors]);

    return { waterQualityRecords, setWaterQualityRecords, waterQualityLoading, setWaterQualityLoading };
};
