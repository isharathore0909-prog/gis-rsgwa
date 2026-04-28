import { useState, useEffect } from 'react';
import api from '../../api';
import useDebounce from '../core/useDebounce';

/**
 * Custom hook for fetching piezometer records
 */
export const usePiezometerData = (isActive, filters) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    const debouncedFilters = useDebounce(filters, 500);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setRecords([]);
            setLoading(false);
            return;
        }
        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {};
                if (debouncedFilters?.district) params.village__grampanchayat__block__district__name = debouncedFilters.district;
                if (debouncedFilters?.block) params.village__grampanchayat__block__name = debouncedFilters.block;
                if (debouncedFilters?.gramPanchayat) params.village__grampanchayat__name = debouncedFilters.gramPanchayat;
                if (debouncedFilters?.village) params.village__name = debouncedFilters.village;

                const data = await api.piezometer.getRecords(params, controller.signal);
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
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [isActive, debouncedFilters]);

    return { data: records, loading };
};
