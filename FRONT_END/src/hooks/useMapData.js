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
// Simple in-memory cache to prevent re-fetching static assets
const geoJSONCache = new Map();
const pendingRequests = new Map();

export const useGeoJSONData = (url, isActive) => {
    const [data, setData] = useState(geoJSONCache.get(url) || null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        if (!isActive || !url) return;

        // excessive logging check - to prevent spamming if needed
        // console.log(`[useGeoJSONData] Requested: ${url}`);

        if (geoJSONCache.has(url)) {
            setData(geoJSONCache.get(url));
            return;
        }

        if (pendingRequests.has(url)) {
            // reuse existing promise
            pendingRequests.get(url)
                .then(data => {
                    if (!ignore) setData(data);
                })
                .catch(err => {
                    if (!ignore) setError(err);
                });
            return;
        }

        const fetchPromise = fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
                return res.json();
            })
            .then(jsonData => {
                geoJSONCache.set(url, jsonData);
                pendingRequests.delete(url);
                if (!ignore) setData(jsonData);
                return jsonData;
            })
            .catch(err => {
                pendingRequests.delete(url);
                if (!ignore) {
                    console.error(`[useGeoJSONData] Error loading ${url}:`, err);
                    setError(err);
                }
                throw err;
            });

        pendingRequests.set(url, fetchPromise);

        return () => { ignore = true; };
    }, [url, isActive]);

    return data;
};
