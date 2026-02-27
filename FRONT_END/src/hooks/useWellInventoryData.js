import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';

export const useWellInventoryData = ({
    displayRegion,
    displayBlock,
    globalFilters,
    clickedLocation,
    selectedWell,
    rainfallStations
}) => {
    const [loading, setLoading] = useState(true);
    const [listData, setListData] = useState([]);
    const [nearbyData, setNearbyData] = useState(null);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [rainfallData, setRainfallData] = useState({});
    const [rainfallLoading, setRainfallLoading] = useState(false);
    const [regionalStats, setRegionalStats] = useState(null);
    const [yearlyTrends, setYearlyTrends] = useState(null);
    const [error, setError] = useState(null);

    const lastFetchParams = useRef({ displayRegion, displayBlock, globalFilters });
    const lastClickedLoc = useRef(clickedLocation);

    // Sync loading state to filter changes
    if (
        lastFetchParams.current.displayRegion !== displayRegion ||
        lastFetchParams.current.displayBlock !== displayBlock ||
        lastFetchParams.current.globalFilters !== globalFilters
    ) {
        if (!loading) setLoading(true);
        lastFetchParams.current = { displayRegion, displayBlock, globalFilters };
    }

    if (clickedLocation !== lastClickedLoc.current) {
        if (clickedLocation && !selectedWell) {
            if (!nearbyLoading) setNearbyLoading(true);
        }
        lastClickedLoc.current = clickedLocation;
    }

    // 1. Fetch List Data
    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { detailed: 'true' };
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                const response = await api.aquifer.getRecords(params);

                if (!ignore) {
                    const records = Array.isArray(response) ? response : (response.results || []);
                    setListData(records);
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching well inventory:", err);
                    setError("Failed to load well inventory data.");
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [displayRegion, displayBlock, globalFilters]);

    // 2. Fetch Nearby Data
    useEffect(() => {
        let ignore = false;
        if (!clickedLocation || selectedWell) {
            setNearbyData(null);
            return;
        }

        const fetchNearbyData = async () => {
            setNearbyLoading(true);
            try {
                const response = await api.aquifer.getNearby({
                    latitude: clickedLocation.lat,
                    longitude: clickedLocation.lng,
                    radius_km: 10
                });

                if (!ignore) {
                    setNearbyData(response && response.averages ? response : null);
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching nearby aquifer data:", err);
                    setNearbyData(null);
                }
            } finally {
                if (!ignore) setNearbyLoading(false);
            }
        };

        fetchNearbyData();
        return () => { ignore = true; };
    }, [clickedLocation, selectedWell]);

    // 3. Fetch Rainfall Data
    useEffect(() => {
        let ignore = false;
        const fetchRainfall = async () => {
            setRainfallLoading(true);
            try {
                const params = {
                    timestep: 'yearly',
                    start_date: '2015-01-01',
                    end_date: '2024-12-31'
                };

                const toTitleCase = (str) => {
                    if (!str || typeof str !== 'string') return str;
                    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                };

                if (selectedWell) {
                    params.village = selectedWell.village_name || selectedWell.village || selectedWell.properties?.village_name;
                    params.block = selectedWell.block;
                    params.district = selectedWell.district;
                } else {
                    if (globalFilters?.village) params.village = globalFilters.village;
                    if (globalFilters?.gramPanchayat) params.gram_panchayat = globalFilters.gramPanchayat;
                    if (displayBlock) params.block = toTitleCase(displayBlock);
                    if (displayRegion && displayRegion !== 'Rajasthan') params.district = toTitleCase(displayRegion);
                }

                let response = [];
                try {
                    // 1. Try Station Summary (High accuracy)
                    response = await api.rainfall.getStationSummary(params);

                    // 2. Fallback to General Summary if station data is empty
                    if (!response || !Array.isArray(response) || response.length === 0) {
                        console.log("Station Rainfall empty, falling back to general records...");
                        const genParams = { ...params };
                        // General summary expects 'gram_panchayat' instead of 'grampanchayat' usually
                        if (globalFilters?.gramPanchayat) genParams.gram_panchayat = globalFilters.gramPanchayat;
                        response = await api.rainfall.getSummary(genParams);
                    }
                } catch (err) {
                    console.error("Rainfall fetch failed", err);
                    response = [];
                }

                if (!ignore && Array.isArray(response)) {
                    const rainMap = {};
                    response.forEach(r => {
                        let yrVal = r.year || r.name || r.date;
                        let finalYear = null;

                        if (yrVal) {
                            if (yrVal instanceof Date) finalYear = yrVal.getFullYear().toString();
                            else if (typeof yrVal === 'string') {
                                if (yrVal.includes('-')) finalYear = new Date(yrVal).getFullYear().toString();
                                else finalYear = yrVal;
                            } else if (typeof yrVal === 'number') finalYear = yrVal.toString();
                        }

                        if (finalYear && finalYear.length === 4) {
                            rainMap[finalYear] = r.average || r.total || 0;
                        }
                    });
                    setRainfallData(rainMap);
                } else if (!ignore) {
                    setRainfallData({});
                }
            } catch (err) {
                if (!ignore) console.error("Error fetching rainfall for well inventory:", err);
            } finally {
                if (!ignore) setRainfallLoading(false);
            }
        };

        fetchRainfall();
        return () => { ignore = true; };
    }, [selectedWell, displayRegion, displayBlock, globalFilters, rainfallStations]);

    // 4. Fetch Regional Stats & Yearly Trends (Backend Aggregation)
    useEffect(() => {
        let ignore = false;
        const fetchRegionalData = async () => {
            try {
                const params = {};
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                // Fire both in parallel
                const [stats, trends] = await Promise.all([
                    api.aquifer.getStatistics(params),
                    api.aquifer.getYearlyStatistics(params)
                ]);

                if (!ignore) {
                    setRegionalStats(stats);
                    setYearlyTrends(trends);
                }
            } catch (err) {
                console.error("Error fetching regional aquifer stats:", err);
            }
        };

        fetchRegionalData();
        return () => { ignore = true; };
    }, [displayRegion, displayBlock, globalFilters]);

    // 5. Data Aggregation
    const aggregatedChartData = useMemo(() => {
        if (yearlyTrends?.yearly_trends) {
            return yearlyTrends.yearly_trends.map(t => ({
                year: t.year,
                'Pre-Monsoon': t.pre_monsoon,
                'Post-Monsoon': t.post_monsoon,
                'Average Water Level': t.average,
                'Annual Rainfall': rainfallData[t.year] ? rainfallData[t.year] / 1000 : null
            }));
        }

        // Fallback to local calculation if backend failed or not yet loaded
        if (!listData || listData.length === 0) return [];
        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => {
            let preSum = 0, preCount = 0;
            let pstSum = 0, pstCount = 0;

            listData.forEach(record => {
                const preVal = record[`pre_${year}`];
                const pstVal = record[`pst_${year}`];
                if (preVal != null) { preSum += parseFloat(preVal); preCount++; }
                if (pstVal != null) { pstSum += parseFloat(pstVal); pstCount++; }
            });

            return {
                year: year.toString(),
                'Pre-Monsoon': preCount > 0 ? parseFloat((preSum / preCount).toFixed(2)) : null,
                'Post-Monsoon': pstCount > 0 ? parseFloat((pstSum / pstCount).toFixed(2)) : null,
                'Average Water Level': (preCount > 0 || pstCount > 0) ? parseFloat(((preSum + pstSum) / (preCount + pstCount)).toFixed(2)) : null,
                'Annual Rainfall': rainfallData[year.toString()] ? rainfallData[year.toString()] / 1000 : null
            };
        });
    }, [yearlyTrends, listData, rainfallData]);

    const nearbyChartData = useMemo(() => {
        if (!nearbyData || !nearbyData.averages) return [];
        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => ({
            year: year.toString(),
            'Pre-Monsoon': nearbyData.averages[year]?.pre?.toFixed(2) || null,
            'Post-Monsoon': nearbyData.averages[year]?.pst?.toFixed(2) || null,
            'Average Water Level': nearbyData.averages[year]?.avg || null,
            'Annual Rainfall': rainfallData[year.toString()] ? rainfallData[year.toString()] / 1000 : null
        }));
    }, [nearbyData, rainfallData]);

    const aquiferDistribution = useMemo(() => {
        if (regionalStats?.aquifer_distribution) {
            return regionalStats.aquifer_distribution.map(d => ({
                name: d.aquifer || 'Unknown',
                value: d.count
            }));
        }

        if (!listData || listData.length === 0) return [];
        const counts = {};
        listData.forEach(record => {
            const aq = record.aquifer || 'Unknown';
            counts[aq] = (counts[aq] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [regionalStats, listData]);

    return {
        loading,
        listData,
        nearbyData,
        nearbyLoading,
        rainfallData,
        rainfallLoading,
        aggregatedChartData,
        nearbyChartData,
        aquiferDistribution,
        totalWells: regionalStats?.summary?.total_wells || listData.length,
        error
    };
};
