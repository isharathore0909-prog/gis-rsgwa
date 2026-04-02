import { useState, useEffect } from 'react';
import api from '../../api';

/**
 * Custom hook for fetching water quality records
 */
export const useWaterQuality = (isActive, filters) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setRecords([]);
            setLoading(false);
            window.waterQualityRecords = [];
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = { map_markers: 'true' };
                if (filters?.district) params.district = filters.district;
                if (filters?.block) params.block = filters.block;
                if (filters?.gramPanchayat) params.gp_id = filters.gramPanchayat;
                if (filters?.village) params.village_name = filters.village;
                if (filters?.villageId) params.village_id = filters.villageId;

                if (!params.district) {
                    if (!ignore) {
                        setRecords([]);
                        setLoading(false);
                        window.waterQualityRecords = [];
                    }
                    return;
                }

                const data = await api.waterQuality.getRecords(params);
                if (!ignore) {
                    // Support both paginated (results) and unpaginated (array) responses
                    const results = data.results || (Array.isArray(data) ? data : []);
                    setRecords(results);
                    window.waterQualityRecords = results;
                    setLoading(false);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[useWaterQuality] Error:', error);
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
