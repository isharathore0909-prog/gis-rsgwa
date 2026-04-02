import { useState, useEffect } from 'react';
import api from '../../api';
import { normalizeDistrictName } from '../../utils/namingUtils';

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

                // Fetch Station District Summaries as per requirement
                const results = await Promise.allSettled([
                    api.rainfall.getStationDistrictWise(params)
                ]);

                const [stationSummaryResult] = results;
                const combinedStats = {};

                // Process summaries
                const processSummary = (summaryData) => {
                    const dataArray = Array.isArray(summaryData) ? summaryData : [];
                    dataArray.forEach(item => {
                        const distName = item.district || item.name || item.dist_name;
                        const avg = item.average_rainfall ?? item.avg_rainfall ?? item.rainfall;
                        if (distName && avg != null) {
                            const key = normalizeDistrictName(distName);
                            combinedStats[key] = parseFloat(avg);
                        }
                    });
                };

                if (stationSummaryResult.status === 'fulfilled') processSummary(stationSummaryResult.value);

                // Simplified: use Station data exclusively. No village record fallback needed.

                if (!ignore) {
                    setDistrictRainfall(combinedStats);
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
 * Custom hook for fetching hierarchical location-wise rainfall data 
 * (block, gp, village) using the dynamic Django aggregated endpoints.
 */
export const useLocationRainfall = (isActive, filters, level) => {
    const [locationRainfall, setLocationRainfall] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!isActive || !level || level === 'district') {
            setLocationRainfall({});
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = { level };
                if (filters?.startDate) params.start_date = filters.startDate;
                if (filters?.endDate) params.end_date = filters.endDate;
                if (filters?.dataRangeStart) params.start_date = filters.dataRangeStart;
                if (filters?.dataRangeEnd) params.end_date = filters.dataRangeEnd;

                // For drill-down, filter by the active parent context
                if (filters?.district) params.district = filters.district;
                if (level !== 'block' && filters?.block) params.block = filters.block;
                if (level === 'village' && filters?.gramPanchayat) params.gram_panchayat = filters.gramPanchayat;

                const results = await Promise.allSettled([
                    api.rainfall.getStationLocationWise(params)
                ]);

                const combinedStats = {};

                // Helper to safely extract names and values
                const processResult = (res) => {
                    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                        res.value.forEach(item => {
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
                processResult(results[0]);

                if (!ignore) {
                    setLocationRainfall(combinedStats);
                    setLoading(false);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('[useLocationRainfall] Error:', error);
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [isActive, level, filters?.district, filters?.block, filters?.gramPanchayat, filters?.startDate, filters?.endDate, filters?.dataRangeStart, filters?.dataRangeEnd]);

    return { data: locationRainfall, loading };
};
