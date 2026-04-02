import { useState, useEffect } from 'react';
import api from '../../api';

/**
 * Custom hook for fetching aquifer/well inventory records
 */
export const useAquiferData = (isActive, filters) => {
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
                const params = {
                    district: filters?.district,
                    block: filters?.block,
                    gp_id: filters?.gramPanchayat,
                    village_id: filters?.villageId,
                    village_name: filters?.village,
                    map_markers: 'true'
                };

                if (!params.district) {
                    if (!ignore) {
                        setRecords([]);
                        setLoading(false);
                    }
                    return;
                }

                const data = await api.aquifer.getRecords(params);
                if (!ignore) {
                    // Support both paginated (results) and unpaginated (array) responses
                    const recordsList = data.results || (Array.isArray(data) ? data : []);
                    setRecords(recordsList);
                    setLoading(false);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[useAquiferData] Error:', error);
                    setRecords([]);
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    return { data: records, loading };
};
