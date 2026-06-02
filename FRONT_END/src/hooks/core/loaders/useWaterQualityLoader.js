import { useState, useEffect, useRef } from 'react';
import api from '../../../api';

export const useWaterQualityLoader = (filters, neighbors) => {
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const lastParamsRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchWQ = async () => {
            const neighbor = neighbors?.[0];

            const params = { detailed: 'true' };
            if (filters?.district_id) params.district_id = filters.district_id;
            else if (filters?.district) params.district = filters.district;
            else if (neighbor?.district || neighbor?.properties?.district)
                params.district = neighbor?.district || neighbor?.properties?.district;

            if (filters?.block_id) params.block_id = filters.block_id;
            else if (filters?.block) params.block = filters.block;
            else if (neighbor?.block || neighbor?.properties?.block)
                params.block = neighbor?.block || neighbor?.properties?.block;

            if (filters?.gp_id) params.gp_id = filters.gp_id;
            else if (filters?.gramPanchayat) params.grampanchayat = filters.gramPanchayat;
            else if (neighbor?.grampanchayat || neighbor?.properties?.grampanchayat)
                params.grampanchayat = neighbor?.grampanchayat || neighbor?.properties?.grampanchayat;

            if (filters?.village_id) params.village_id = filters.village_id;
            else if (filters?.village) params.village_name = filters.village;
            else if (neighbor?.village || neighbor?.properties?.village)
                params.village_name = neighbor?.village || neighbor?.properties?.village;

            const paramsKey = JSON.stringify(params);

            // Skip only if same params AND we already have data
            if (paramsKey === lastParamsRef.current && waterQualityRecords.length > 0) {
                return;
            }
            lastParamsRef.current = paramsKey;

            setWaterQualityLoading(true);
            const timeoutId = setTimeout(() => {
                if (!signal.aborted) setWaterQualityLoading(false);
            }, 15000);

            try {
                const response = await api.waterQuality.getRecords(params, signal);
                if (!signal.aborted) {
                    const records = response.results || response || [];
                    setWaterQualityRecords(records);
                    setWaterQualityLoading(false);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                if (!signal.aborted) {
                    setWaterQualityRecords([]);
                    setWaterQualityLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };

        fetchWQ();

        return () => {
            controller.abort();
            // Reset dedup ref so the next effect run always re-fetches
            lastParamsRef.current = null;
        };
    }, [
        filters?.district, filters?.district_id,
        filters?.block, filters?.block_id,
        filters?.gramPanchayat, filters?.gp_id,
        filters?.village, filters?.village_id,
        neighbors
    ]);

    return { waterQualityRecords, setWaterQualityRecords, waterQualityLoading, setWaterQualityLoading };
};
