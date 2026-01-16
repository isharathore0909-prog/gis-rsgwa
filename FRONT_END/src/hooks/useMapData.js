import { useState, useEffect } from 'react';
import api from '../api';

/**
 * Custom hook for fetching district-wise rainfall data
 */
export const useDistrictRainfall = (isActive) => {
    const [districtRainfall, setDistrictRainfall] = useState({});

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setDistrictRainfall({});
            return;
        }

        const fetchData = async () => {
            try {
                const data = await api.rainfall.getDistrictWise();
                if (!ignore) {
                    console.log('[useDistrictRainfall] Fetched district data:', data?.length);
                    const stats = {};
                    data.forEach(item => {
                        if (item.district) {
                            stats[item.district.toUpperCase()] = item.average_rainfall;
                        }
                    });
                    setDistrictRainfall(stats);
                }
            } catch (error) {
                if (!ignore) console.error('[useDistrictRainfall] Error:', error);
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive]);

    return districtRainfall;
};

/**
 * Custom hook for fetching water quality records
 */
export const useWaterQuality = (isActive, filters) => {
    const [records, setRecords] = useState([]);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setRecords([]);
            window.waterQualityRecords = [];
            return;
        }

        const fetchData = async () => {
            try {
                const params = {};
                if (filters?.district) params.district = filters.district;
                if (filters?.block) params.block = filters.block;
                if (filters?.gramPanchayat) params.grampanchayat = filters.gramPanchayat;
                if (filters?.village) params.village_name = filters.village;

                if (!params.district) {
                    if (!ignore) {
                        setRecords([]);
                        window.waterQualityRecords = [];
                    }
                    return;
                }

                const data = await api.waterQuality.getRecords(params);
                if (!ignore) {
                    const results = data.results || data || [];
                    setRecords(results);
                    window.waterQualityRecords = results;
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[useWaterQuality] Error:', error);
                    setRecords([]);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    return records;
};

/**
 * Custom hook for fetching aquifer/well inventory records
 */
export const useAquiferData = (isActive, filters) => {
    const [records, setRecords] = useState([]);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setRecords([]);
            return;
        }

        const fetchData = async () => {
            try {
                const params = {
                    district: filters?.district,
                    block: filters?.block,
                    grampanchayat: filters?.gramPanchayat,
                    village_name: filters?.village,
                    detailed: 'true'
                };

                if (!params.district) {
                    if (!ignore) setRecords([]);
                    return;
                }

                const data = await api.aquifer.getRecords(params);
                if (!ignore) {
                    setRecords(data.results || data || []);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[useAquiferData] Error:', error);
                    setRecords([]);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    return records;
};

/**
 * Custom hook for loading GeoJSON files
 */
export const useGeoJSONData = (url, isActive) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        let ignore = false;
        if (!isActive || !url) return;

        fetch(url)
            .then(res => res.json())
            .then(data => { if (!ignore) setData(data); })
            .catch(err => { if (!ignore) console.error(`[useGeoJSONData] Error loading ${url}:`, err); });

        return () => { ignore = true; };
    }, [url, isActive]);

    return data;
};
