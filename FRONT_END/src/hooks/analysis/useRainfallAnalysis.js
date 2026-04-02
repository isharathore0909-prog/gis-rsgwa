import { useState, useEffect, useRef } from 'react';
import api from '../../api';

export const useRainfallAnalysis = ({
    isRainfall,
    globalFilters,
    displayRegion,
    displayBlock,
    clickedLocation,
    neighbor,
    selectedBoundary,
    blockData,
    rainfallStations,
    dynamicBoundaries = [],
    rainfallDataSource = 'station',
    parentRainfallLoading,
    rajasthanId
}) => {
    const [rainfallStatsData, setRainfallStatsData] = useState(null);
    const [rainfallSummaryData, setRainfallSummaryData] = useState([]);
    const [intersectingStationIds, setIntersectingStationIds] = useState([]);
    const [rainfallError, setRainfallError] = useState(null);
    const [rainfallLoading, setRainfallLoading] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    // Persist parameters to avoid redundant network calls and loops
    const lastParamsRef = useRef(null);

    useEffect(() => {
        let ignore = false;
        let controller = new AbortController();

        if (!isRainfall) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setIntersectingStationIds([]);
            setRainfallError(null);
            lastParamsRef.current = null;
            return;
        }

        const fetchRainfallStats = async () => {
            if (!rajasthanId) {
                setRainfallLoading(false);
                return;
            }
            // Wait for 300ms to debounce rapid property changes (e.g. while dragging map)
            await new Promise(resolve => setTimeout(resolve, 300));
            if (ignore) return;

            const toTitleCase = (str) => {
                if (!str) return str;
                const strValue = typeof str === 'string' ? str : String(str);
                return strValue.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            };

            // 1. Build Base Parameters
            const baseParams = {};
            const isStateOverview = !displayRegion || displayRegion === 'Rajasthan';

            if (!isStateOverview) {
                if (displayRegion) baseParams.district = toTitleCase(displayRegion);
                if (globalFilters?.block_id) baseParams.block_id = globalFilters.block_id;
                else if (displayBlock) baseParams.block = toTitleCase(displayBlock);
                if (globalFilters?.gp_id) baseParams.gp_id = globalFilters.gp_id;
                else if (globalFilters?.gramPanchayat) baseParams.gram_panchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village_id) baseParams.village_id = globalFilters.village_id;
                else if (globalFilters?.village) baseParams.village = globalFilters.village;
            }

            if (globalFilters?.dataRangeStart) baseParams.start_date = globalFilters.dataRangeStart;
            if (globalFilters?.dataRangeEnd) baseParams.end_date = globalFilters.dataRangeEnd;
            if (globalFilters?.timestep) baseParams.timestep = globalFilters.timestep;

            // 2. Resolve Target Geometry
            let targetFeature = null;
            if (neighbor?.geometry) targetFeature = neighbor;
            else if (selectedBoundary?.geometry) targetFeature = selectedBoundary;

            const featureId = targetFeature
                ? (targetFeature.id || targetFeature.properties?.id || JSON.stringify(targetFeature.geometry.coordinates).slice(0, 40))
                : 'none';

            // Stable key including important factors
            const paramsKey = `${JSON.stringify(baseParams)}-${featureId}-${rainfallStations?.length || 0}`;

            if (lastParamsRef.current === paramsKey) {
                return;
            }
            lastParamsRef.current = paramsKey;

            setRainfallLoading(true);
            try {
                let currentIntersectingIds = [];
                let finalBaseParams = { ...baseParams };

                // 3. Spatial Filtering
                if (!isStateOverview && targetFeature && rainfallStations?.length > 0) {
                    const turf = await import('@turf/turf');
                    if (ignore) return;

                    const ids = [];
                    const stationPoints = [];

                    rainfallStations.forEach(station => {
                        if (station.latitude && station.longitude) {
                            const pt = turf.point([parseFloat(station.longitude), parseFloat(station.latitude)], { id: station.id || station.station_id });
                            stationPoints.push(pt);
                            if (turf.booleanPointInPolygon(pt, targetFeature)) {
                                ids.push(station.id || station.station_id);
                            }
                        }
                    });

                    if (ids.length === 0 && stationPoints.length > 0) {
                        try {
                            const centroid = turf.centroid(targetFeature);
                            const nearest = turf.nearestPoint(centroid, turf.featureCollection(stationPoints));
                            if (nearest?.properties?.id) ids.push(nearest.properties.id);
                        } catch (e) { }
                    }

                    if (ids.length > 0) {
                        finalBaseParams.station_ids = ids.join(',');
                        currentIntersectingIds = ids;
                    } else if (displayBlock || globalFilters?.gramPanchayat) {
                        finalBaseParams.station_ids = '-1';
                    }
                }

                if (ignore) return;

                // 4. Parallel Fetch with Abort Signal support if api client supports it
                // We'll use the signal to cancel axios requests if supported
                const [stats, summary] = await Promise.all([
                    api.rainfall.getStationStatistics(finalBaseParams),
                    api.rainfall.getStationSummary({ ...finalBaseParams, timestep: globalFilters?.timestep || 'monthly' })
                ]);

                if (!ignore) {
                    // Extract station names for UI transparency
                    const stationNames = (stats.isStationData && stats.maxVillage)
                        ? [stats.maxVillage]
                        : (rainfallStations.filter(s => currentIntersectingIds.includes(s.id)).map(s => s.name));

                    setRainfallStatsData({
                        ...stats,
                        stationNames,
                        isFallback: currentIntersectingIds.length === 1 && !isStateOverview && !targetFeature?.properties?.name?.toUpperCase()?.includes(stationNames[0]?.toUpperCase())
                    });
                    setRainfallSummaryData(summary || []);
                    setIntersectingStationIds(currentIntersectingIds);
                    setRainfallError(null);
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Rainfall fetch failed:', err);
                    // If backend returned connection error, retry after a delay
                    if (apiRetryCount < 3 && (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!ignore) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setRainfallError(err.message);
                    }
                }
            } finally {
                if (!ignore) setRainfallLoading(false);
            }
        };

        const safetyTimeout = setTimeout(() => {
            if (!ignore) setRainfallLoading(false);
        }, 30000);

        fetchRainfallStats();

        return () => {
            ignore = true;
            controller.abort();
            clearTimeout(safetyTimeout);
        };
    }, [
        isRainfall, displayRegion, displayBlock,
        globalFilters?.gramPanchayat, globalFilters?.village,
        globalFilters?.dataRangeStart, globalFilters?.dataRangeEnd, globalFilters?.timestep,
        rainfallStations?.length, rainfallDataSource, selectedBoundary, neighbor, blockData, dynamicBoundaries?.length, rajasthanId, apiRetryCount
    ]);

    return {
        rainfallStatsData,
        rainfallSummaryData,
        intersectingStationIds,
        rainfallLoading: parentRainfallLoading || rainfallLoading,
        rainfallError
    };
};
