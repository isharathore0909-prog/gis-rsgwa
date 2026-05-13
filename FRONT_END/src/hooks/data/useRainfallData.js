import { useState, useEffect } from 'react';
import api from '../../api';
import { normalizeDistrictName } from '../../utils/namingUtils';
import useDebounce from '../core/useDebounce';
import { notificationService } from '../../services/notificationService';

/**
 * Custom hook for fetching district-wise rainfall data
 * Prioritizes station rainfall data which has direct district information
 */
export const useDistrictRainfall = (isActive, filters) => {
    const [districtRainfall, setDistrictRainfall] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const debouncedFilters = useDebounce(filters, 500);

    useEffect(() => {

        let ignore = false;
        if (!isActive) {
            setDistrictRainfall({});
            setLoading(false);
            setError(null);
            return;
        }

        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Prepare filters - specifically extract date range if present
                const params = { limit: 10000 }; // Get more records for accurate averaging
                if (debouncedFilters?.startDate) params.start_date = debouncedFilters.startDate;
                if (debouncedFilters?.endDate) params.end_date = debouncedFilters.endDate;
                if (debouncedFilters?.dataRangeStart) params.start_date = debouncedFilters.dataRangeStart;
                if (debouncedFilters?.dataRangeEnd) params.end_date = debouncedFilters.dataRangeEnd;

                // Fetch Station District Summaries as per requirement
                const summaries = await api.rainfall.getStationDistrictWise(params, controller.signal);

                const normalizedSums = {};
                const normalizedCounts = {};
                const nameToNormalized = {};

                // Process summaries
                const processSummary = (summaryData) => {
                    const dataArray = Array.isArray(summaryData) ? summaryData : [];
                    dataArray.forEach(item => {
                        const distName = item.district || item.name || item.dist_name;
                        const avg = item.average_rainfall ?? item.avg_rainfall ?? item.rainfall;
                        if (distName && avg != null) {
                            const val = parseFloat(avg);
                            const normKey = normalizeDistrictName(distName);

                            if (!normalizedSums[normKey]) {
                                normalizedSums[normKey] = 0;
                                normalizedCounts[normKey] = 0;
                            }
                            normalizedSums[normKey] += val;
                            normalizedCounts[normKey] += 1;

                            const upperName = distName.toString().toUpperCase().trim();
                            if (!nameToNormalized[normKey]) nameToNormalized[normKey] = new Set();
                            nameToNormalized[normKey].add(upperName);
                        }
                    });
                };

                processSummary(summaries);

                const combinedStats = {};
                Object.keys(normalizedSums).forEach(normKey => {
                    const avg = normalizedSums[normKey] / normalizedCounts[normKey];
                    // Provide the average to the normalized key
                    combinedStats[normKey] = avg;
                    // AND provide it to all raw name variants found (crucial for SLD matching)
                    if (nameToNormalized[normKey]) {
                        nameToNormalized[normKey].forEach(rawName => {
                            combinedStats[rawName] = avg;
                        });
                    }
                });

                if (!ignore) {
                    setDistrictRainfall(combinedStats);
                    setLoading(false);
                }
            } catch (error) {
                if (error.name === 'CanceledError' || error.name === 'AbortError') {
                    return;
                }
                if (!ignore) {
                    console.error('[useDistrictRainfall] Error:', error);
                    setError(error.message);
                    setLoading(false);
                    notificationService.error(`Failed to fetch district rainfall: ${error.message}`);
                }
            }
        };

        fetchData();
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [isActive, debouncedFilters]);

    return { data: districtRainfall, loading, error };
};

/**
 * Custom hook for fetching hierarchical location-wise rainfall data 
 * (block, gp, village) using the dynamic Django aggregated endpoints.
 */
export const useLocationRainfall = (isActive, filters, level) => {
    const [locationRainfall, setLocationRainfall] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const debouncedFilters = useDebounce(filters, 500);

    useEffect(() => {

        let ignore = false;
        if (!isActive || !level || level === 'district') {
            setLocationRainfall({});
            setLoading(false);
            setError(null);
            return;
        }

        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { level };
                if (debouncedFilters?.startDate) params.start_date = debouncedFilters.startDate;
                if (debouncedFilters?.endDate) params.end_date = debouncedFilters.endDate;
                if (debouncedFilters?.dataRangeStart) params.start_date = debouncedFilters.dataRangeStart;
                if (debouncedFilters?.dataRangeEnd) params.end_date = debouncedFilters.dataRangeEnd;

                // For drill-down, filter by the active parent context
                if (debouncedFilters?.district) params.district = debouncedFilters.district;
                if (level !== 'block' && debouncedFilters?.block) params.block = debouncedFilters.block;
                if (level === 'village' && debouncedFilters?.gramPanchayat) params.gram_panchayat = debouncedFilters.gramPanchayat;

                const results = await api.rainfall.getStationLocationWise(params, controller.signal);

                const combinedStats = {};

                // Helper to safely extract names and values
                const processResult = (itemArray) => {
                    if (Array.isArray(itemArray)) {
                        itemArray.forEach(item => {
                            if (item.location && item.average_rainfall != null) {
                                let keyName = item.location;
                                // If parent exists, use composite key to match useMapProcessing/geoJSON maps
                                if (item.parent) {
                                    const formattedParent = normalizeDistrictName(item.parent);
                                    const formattedLoc = keyName.toString().trim().toUpperCase();
                                    combinedStats[`${formattedParent}|${formattedLoc}`] = parseFloat(item.average_rainfall);
                                } else {
                                    combinedStats[keyName.toString().trim().toUpperCase()] = parseFloat(item.average_rainfall);
                                }
                            }
                        });
                    }
                };

                // Exclusively use Station data
                processResult(results);

                if (!ignore) {
                    setLocationRainfall(combinedStats);
                    setLoading(false);
                }
            } catch (error) {
                if (error.name === 'CanceledError' || error.name === 'AbortError') {
                    return;
                }
                if (!ignore) {
                    console.error('[useLocationRainfall] Error:', error);
                    setError(error.message);
                    setLoading(false);
                    notificationService.error(`Failed to fetch ${level} rainfall: ${error.message}`);
                }
            }
        };

        fetchData();
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [isActive, level, debouncedFilters]);

    return { data: locationRainfall, loading, error };
};
