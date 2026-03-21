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
    rainfallDataSource = 'station',
    parentRainfallLoading
}) => {
    const [rainfallStatsData, setRainfallStatsData] = useState(null);
    const [rainfallSummaryData, setRainfallSummaryData] = useState([]);
    const [rainfallError, setRainfallError] = useState(null);
    const [rainfallLoading, setRainfallLoading] = useState(true);
    const lastRainfallDeps = useRef({
        isRainfall, displayRegion, displayBlock,
        gp: globalFilters?.gramPanchayat, v: globalFilters?.village,
        start: globalFilters?.dataRangeStart, end: globalFilters?.dataRangeEnd,
        ts: globalFilters?.timestep, lat: clickedLocation?.lat, lng: clickedLocation?.lng
    });
    const rainfallParamsCacheRef = useRef(null);

    // Sync loading state to filter changes
    if (isRainfall && (
        lastRainfallDeps.current.isRainfall !== isRainfall ||
        lastRainfallDeps.current.displayRegion !== displayRegion ||
        lastRainfallDeps.current.displayBlock !== displayBlock ||
        lastRainfallDeps.current.gp !== globalFilters?.gramPanchayat ||
        lastRainfallDeps.current.v !== globalFilters?.village ||
        lastRainfallDeps.current.start !== globalFilters?.dataRangeStart ||
        lastRainfallDeps.current.end !== globalFilters?.dataRangeEnd ||
        lastRainfallDeps.current.ts !== globalFilters?.timestep ||
        lastRainfallDeps.current.lat !== clickedLocation?.lat ||
        lastRainfallDeps.current.lng !== clickedLocation?.lng
    )) {
        if (!rainfallLoading) {
            setRainfallLoading(true);
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
        }
        lastRainfallDeps.current = {
            isRainfall, displayRegion, displayBlock,
            gp: globalFilters?.gramPanchayat, v: globalFilters?.village,
            start: globalFilters?.dataRangeStart, end: globalFilters?.dataRangeEnd,
            ts: globalFilters?.timestep, lat: clickedLocation?.lat, lng: clickedLocation?.lng
        };
    }

    useEffect(() => {
        let ignore = false;
        if (!isRainfall) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setRainfallError(null);
            rainfallParamsCacheRef.current = null;
            return;
        }

        const fetchRainfallStats = async () => {
            const baseParams = {};
            const toTitleCase = (str) => {
                if (!str) return str;
                const strValue = typeof str === 'string' ? str : String(str);
                return strValue.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            };

            const isStation = rainfallDataSource === 'station';
            if (globalFilters?.district_id && !isStation) {
                baseParams.district_id = globalFilters.district_id;
            } else if (displayRegion && displayRegion !== 'Rajasthan') {
                const regionStr = typeof displayRegion === 'string' ? displayRegion : String(displayRegion);
                baseParams.district = toTitleCase(regionStr.trim());
            }

            if (globalFilters?.block_id) {
                baseParams.block_id = globalFilters.block_id;
            } else if (displayBlock) {
                const blockStr = typeof displayBlock === 'string' ? displayBlock : String(displayBlock);
                baseParams.block = toTitleCase(blockStr.trim());
            }

            if (globalFilters?.gp_id) {
                baseParams.gp_id = globalFilters.gp_id;
            } else if (globalFilters?.gramPanchayat) {
                const gpStr = typeof globalFilters.gramPanchayat === 'string' ? globalFilters.gramPanchayat : String(globalFilters.gramPanchayat);
                baseParams.gram_panchayat = gpStr.trim();
            }

            if (globalFilters?.village_id) {
                baseParams.village_id = globalFilters.village_id;
            } else if (globalFilters?.village) {
                const villageStr = typeof globalFilters.village === 'string' ? globalFilters.village : String(globalFilters.village);
                baseParams.village = villageStr.trim();
            }
            if (globalFilters?.dataRangeStart) baseParams.start_date = globalFilters.dataRangeStart;
            if (globalFilters?.dataRangeEnd) baseParams.end_date = globalFilters.dataRangeEnd;

            if (baseParams.district === 'Rajasthan') delete baseParams.district;

            setRainfallLoading(true);
            try {
                let currentBaseParams = { ...baseParams };
                let currentSummaryParams = { ...baseParams, timestep: globalFilters?.timestep || 'monthly' };

                // Apply spatial filtering if block, GP, or village is selected
                if ((displayBlock || globalFilters?.gramPanchayat || globalFilters?.village) && rainfallStations?.length > 0) {
                    try {
                        const turf = await import('@turf/turf');
                        let targetFeature = null;

                        if (neighbor && neighbor.geometry) {
                            targetFeature = neighbor;
                        } else if (selectedBoundary && selectedBoundary.geometry) {
                            targetFeature = selectedBoundary;
                        } else if (displayBlock && blockData?.features) {
                            targetFeature = blockData.features.find(f => {
                                const bName = (f.properties?.BLOCK_NAME || f.properties?.Block || f.properties?.name || '').toString().toUpperCase().trim();
                                return bName === displayBlock.toString().toUpperCase().trim();
                            });
                        }

                        if (targetFeature && targetFeature.geometry) {
                            const intersectingStationIds = [];
                            rainfallStations.forEach(station => {
                                if (station.latitude && station.longitude) {
                                    const pt = turf.point([parseFloat(station.longitude), parseFloat(station.latitude)]);
                                    if (turf.booleanPointInPolygon(pt, targetFeature)) {
                                        intersectingStationIds.push(station.id || station.station_id);
                                    }
                                }
                            });
                            const idsStr = intersectingStationIds.length > 0 ? intersectingStationIds.join(',') : '-1';
                            currentBaseParams.station_ids = idsStr;
                            currentSummaryParams.station_ids = idsStr;
                        }
                    } catch (e) {
                        console.warn('[RainfallStats] Spatial filtering failed:', e);
                    }
                }


                const [stats, summary] = await Promise.all([
                    isStation
                        ? api.rainfall.getStationStatistics(currentBaseParams)
                        : api.rainfall.getStatistics(currentBaseParams),
                    isStation
                        ? api.rainfall.getStationSummary(currentSummaryParams)
                        : api.rainfall.getSummary(currentSummaryParams)
                ]);

                if (!ignore) {
                    setRainfallStatsData(stats);
                    setRainfallSummaryData(summary);
                    setRainfallError(null);
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch rainfall stats:', err);
                    setRainfallError(err.message);
                }
            } finally {
                if (!ignore) setRainfallLoading(false);
            }
        };

        fetchRainfallStats();
        return () => { ignore = true; };
    }, [isRainfall, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, globalFilters?.dataRangeStart, globalFilters?.dataRangeEnd, globalFilters?.timestep, clickedLocation, rainfallStations, rainfallDataSource, selectedBoundary, neighbor, blockData]);

    return {
        rainfallStatsData,
        rainfallSummaryData,
        rainfallLoading: parentRainfallLoading || rainfallLoading,
        rainfallError
    };
};
