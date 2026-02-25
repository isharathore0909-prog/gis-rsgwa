import { useState, useEffect } from 'react';
import api from '../api';

/**
 * Custom hook for fetching district-wise rainfall data
 * Prioritizes station rainfall data which has direct district information
 */
export const useDistrictRainfall = (isActive, filters) => {
    const [districtRainfall, setDistrictRainfall] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!isActive) {
            setDistrictRainfall({});
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Prepare filters - specifically extract date range if present
                const params = { limit: 10000 }; // Get more records for accurate averaging
                if (filters?.startDate) params.start_date = filters.startDate;
                if (filters?.endDate) params.end_date = filters.endDate;
                if (filters?.dataRangeStart) params.start_date = filters.dataRangeStart;
                if (filters?.dataRangeEnd) params.end_date = filters.dataRangeEnd;

                // PRIMARY: Try station rainfall district_wise endpoint (has direct district field)
                let data = await api.rainfall.getStationDistrictWise(params);

                // FALLBACK 1: If station data is empty, try village-based district_wise
                if (!data || data.length === 0) {
                    data = await api.rainfall.getDistrictWise(params);
                }

                // FALLBACK 2: If both are empty, calculate from village records
                if (!data || data.length === 0) {
                    const villageRecords = await api.rainfall.getRecords(params);
                    const records = villageRecords.results || villageRecords || [];

                    // Calculate district averages from village data
                    const districtData = {};
                    records.forEach(record => {
                        const district = record.village?.grampanchayat?.block?.district?.name ||
                            record.district ||
                            record.village_district;

                        if (district && record.rainfall_mm != null) {
                            const key = district.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (!districtData[key]) {
                                districtData[key] = { total: 0, count: 0, name: district };
                            }
                            districtData[key].total += parseFloat(record.rainfall_mm) || 0;
                            districtData[key].count += 1;
                        }
                    });

                    // Convert to average
                    data = Object.keys(districtData).map(key => ({
                        district: districtData[key].name,
                        average_rainfall: districtData[key].count > 0
                            ? districtData[key].total / districtData[key].count
                            : 0
                    }));
                }

                if (!ignore) {
                    const stats = {};
                    data.forEach(item => {
                        if (item.district) {
                            const key = item.district.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                            stats[key] = item.average_rainfall;
                        }
                    });
                    setDistrictRainfall(stats);
                    setLoading(false);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[useDistrictRainfall] Error:', error);
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive, filters?.startDate, filters?.endDate, filters?.dataRangeStart, filters?.dataRangeEnd]);

    return { data: districtRainfall, loading };
};

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
                const params = {};
                if (filters?.district) params.district = filters.district;
                if (filters?.block) params.block = filters.block;
                if (filters?.gramPanchayat) params.grampanchayat = filters.gramPanchayat;
                if (filters?.village) params.village_name = filters.village;

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
                    const results = data.results || data || [];
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
                    grampanchayat: filters?.gramPanchayat,
                    village_name: filters?.village,
                    detailed: 'true'
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
                    setRecords(data.results || data || []);
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

/**
 * Custom hook for loading GeoJSON files
 */
// Simple in-memory cache to prevent re-fetching static assets
const geoJSONCache = new Map();
const pendingRequests = new Map();

export const useGeoJSONData = (url, isActive) => {
    const [data, setData] = useState(geoJSONCache.get(url) || null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!isActive || !url) return;

        if (geoJSONCache.has(url)) {
            setData(geoJSONCache.get(url));
            setLoading(false);
            return;
        }

        setLoading(true);

        if (pendingRequests.has(url)) {
            pendingRequests.get(url)
                .then(data => {
                    if (!ignore) {
                        setData(data);
                        setLoading(false);
                    }
                })
                .catch(err => {
                    if (!ignore) {
                        setError(err);
                        setLoading(false);
                    }
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
                if (!ignore) {
                    setData(jsonData);
                    setLoading(false);
                }
                return jsonData;
            })
            .catch(err => {
                pendingRequests.delete(url);
                if (!ignore) {
                    console.error(`[useGeoJSONData] Error loading ${url}:`, err);
                    setError(err);
                    setLoading(false);
                }
                throw err;
            });

        pendingRequests.set(url, fetchPromise);

        return () => { ignore = true; };
    }, [url, isActive]);

    return { data, loading, error };
};
