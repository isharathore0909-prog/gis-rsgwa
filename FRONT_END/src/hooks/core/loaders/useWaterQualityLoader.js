import { useState, useEffect } from 'react';
import api from '../../../api';

export const useWaterQualityLoader = (filters, neighbors) => {
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const fetchWQ = async () => {
            setWaterQualityLoading(true);
            const timeoutId = setTimeout(() => {
                if (!ignore) setWaterQualityLoading(false);
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
                    village_name: filters.village || neighbor?.village || neighbor?.properties?.village
                };

                params.detailed = 'true';

                const response = await api.waterQuality.getRecords(params);
                if (!ignore) {
                    setWaterQualityRecords(response.results || response || []);
                    setWaterQualityLoading(false);
                }
            } catch (err) {
                if (!ignore) {
                    setWaterQualityRecords([]);
                    setWaterQualityLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchWQ();
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, neighbors]);

    return { waterQualityRecords, setWaterQualityRecords, waterQualityLoading, setWaterQualityLoading };
};
