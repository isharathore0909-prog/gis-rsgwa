import { useState, useEffect } from 'react';
import api from '../../api';

/**
 * Custom hook for fetching piezometer records
 */
export const usePiezometerData = (isActive, filters) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setRecords([]);
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {};
                if (filters?.district) params.village__grampanchayat__block__district__name = filters.district;
                if (filters?.block) params.village__grampanchayat__block__name = filters.block;
                if (filters?.gramPanchayat) params.village__grampanchayat__name = filters.gramPanchayat;
                if (filters?.village) params.village__name = filters.village;

                const data = await api.piezometer.getRecords(params);
                if (!ignore) {
                    setRecords(data.results || data || []);
                    setLoading(false);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[usePiezometerData] Error:', error);
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, filters?.showPiezometers]);

    return { data: records, loading };
};
