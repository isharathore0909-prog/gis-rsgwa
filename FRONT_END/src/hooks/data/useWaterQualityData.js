import { useState, useEffect } from 'react';
import api from '../../api';
import useDebounce from '../core/useDebounce';
import { notificationService } from '../../services/notificationService';

/**
 * Custom hook for fetching water quality records
 */
export const useWaterQuality = (isActive, filters) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    const debouncedFilters = useDebounce(filters, 500);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setRecords([]);
            setLoading(false);
            window.waterQualityRecords = [];
            return;
        }

        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = { map_markers: 'true' };
                if (debouncedFilters?.district) params.district = debouncedFilters.district;
                if (debouncedFilters?.block) params.block = debouncedFilters.block;
                if (debouncedFilters?.gramPanchayat) params.gp_id = debouncedFilters.gramPanchayat;
                if (debouncedFilters?.village) params.village_name = debouncedFilters.village;
                if (debouncedFilters?.villageId) params.village_id = debouncedFilters.villageId;

                if (!params.district) {
                    if (!ignore) {
                        setRecords([]);
                        setLoading(false);
                        window.waterQualityRecords = [];
                    }
                    return;
                }

                const data = await api.waterQuality.getRecords(params, controller.signal);
                if (!ignore) {
                    // Support both paginated (results) and unpaginated (array) responses
                    const results = data.results || (Array.isArray(data) ? data : []);
                    setRecords(results);
                    window.waterQualityRecords = results;
                    setLoading(false);
                }
            } catch (error) {
                if (error.name === 'CanceledError' || error.name === 'AbortError') {
                    return;
                }
                if (!ignore) {
                    console.error('[useWaterQuality] Error:', error);
                    setRecords([]);
                    setLoading(false);
                    notificationService.error(`Failed to fetch water quality wells: ${error.message}`);
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
