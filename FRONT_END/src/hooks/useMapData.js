import { useState, useEffect } from 'react';
import api from '../api';

/**
 * Custom hook for fetching district-wise rainfall data
 */
export const useDistrictRainfall = (isActive) => {
    const [districtRainfall, setDistrictRainfall] = useState({});

    useEffect(() => {
        if (!isActive) {
            setDistrictRainfall({});
            return;
        }

        const fetchData = async () => {
            try {
                // Data source: D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\db.sqlite3
                // Table: rainfallApi_rainfall, Column: rainfall_mm (averaged)
                const data = await api.rainfall.getDistrictWise();
                console.log('[useDistrictRainfall] Fetched district data:', data?.length);
                const stats = {};
                data.forEach(item => {
                    if (item.district) {
                        stats[item.district.toUpperCase()] = item.average_rainfall;
                    }
                });
                setDistrictRainfall(stats);
            } catch (error) {
                console.error('[useDistrictRainfall] Error:', error);
            }
        };

        fetchData();
    }, [isActive]);

    return districtRainfall;
};

/**
 * Custom hook for fetching water quality records
 */
export const useWaterQuality = (isActive, filters) => {
    const [records, setRecords] = useState([]);

    useEffect(() => {
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
                    setRecords([]);
                    window.waterQualityRecords = [];
                    return;
                }

                const data = await api.waterQuality.getRecords(params);
                const results = data.results || data || [];
                setRecords(results);
                window.waterQualityRecords = results;
            } catch (error) {
                console.error('[useWaterQuality] Error:', error);
                setRecords([]);
            }
        };

        fetchData();
    }, [isActive, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    return records;
};

/**
 * Custom hook for fetching aquifer/well inventory records
 */
export const useAquiferData = (isActive, filters) => {
    const [records, setRecords] = useState([]);

    useEffect(() => {
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
                    setRecords([]);
                    return;
                }

                const data = await api.aquifer.getRecords(params);
                setRecords(data.results || data || []);
            } catch (error) {
                console.error('[useAquiferData] Error:', error);
                setRecords([]);
            }
        };

        fetchData();
    }, [isActive, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    return records;
};

/**
 * Custom hook for loading GeoJSON files
 */
export const useGeoJSONData = (url, isActive) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!isActive || !url) return;

        fetch(url)
            .then(res => res.json())
            .then(setData)
            .catch(err => console.error(`[useGeoJSONData] Error loading ${url}:`, err));
    }, [url, isActive]);

    return data;
};
