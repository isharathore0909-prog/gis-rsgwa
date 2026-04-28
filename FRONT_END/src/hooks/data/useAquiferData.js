import { useState, useEffect } from 'react';
import api from '../../api';
import useDebounce from '../core/useDebounce';

/**
 * Custom hook for fetching aquifer/well inventory records
 */
export const useAquiferData = (isActive, filters) => {
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
                const params = {
                    district: debouncedFilters?.district,
                    block: debouncedFilters?.block,
                    gp_id: debouncedFilters?.gramPanchayat,
                    village_id: debouncedFilters?.villageId,
                    village_name: debouncedFilters?.village,
                    map_markers: 'true'
                };

                // Skip fetching thousands of markers at the state level to prevent browser lag.
                // Map markers should only be shown when a specific district is selected.
                if (!params.district || params.district.toUpperCase() === 'RAJASTHAN') {
                    if (!ignore) {
                        setRecords([]);
                        setLoading(false);
                    }
                    return;
                }

                const data = await api.aquifer.getRecords(params, controller.signal);
                if (!ignore) {
                    // Support both paginated (results) and unpaginated (array) responses
                    const recordsList = data.results || (Array.isArray(data) ? data : []);
                    setRecords(recordsList);
                    setLoading(false);
                }
            } catch (error) {
                if (error.name === 'CanceledError' || error.name === 'AbortError') {
                    return;
                }
                if (!ignore) {
                    console.error('[useAquiferData] Error:', error);
                    setRecords([]);
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
