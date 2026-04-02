import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';
import { getAquiferColor, normalizeAquiferName } from '../../constants/mapConstants';
import { resolveAquiferDistrict } from '../../constants/districtAliases';

// Simple in-memory cache for aquifer_opt.json to prevent re-fetching 22MB file
const aquiferGeoJSONCache = {
    data: null,
    promise: null
};

// Cache for district boundaries to avoid 13MB re-fetch
const districtGeoJSONCache = {
    data: null,
    promise: null
};

export const useAquiferAnalysis = ({
    isAquifer,
    isGWRE,
    isWellInventory,
    isRainfall,
    isWaterQuality,
    isRechargeStructure,
    globalFilters,
    displayRegion,
    displayBlock,
    clickedLocation,
    neighbor,
    selectedBoundary,
    blockData,
    rajasthanId
}) => {
    const [aquiferStats, setAquiferStats] = useState(null);
    const [aquiferLoading, setAquiferLoading] = useState(true);
    const [aquiferSpatialStats, setAquiferSpatialStats] = useState(null);
    const [aquiferPolygons, setAquiferPolygons] = useState(null);
    const [spatialStatsLoading, setSpatialStatsLoading] = useState(false);

    // Consolidated extra data for Well Inventory mode
    const [aquiferRecords, setAquiferRecords] = useState([]);
    const [yearlyTrends, setYearlyTrends] = useState(null);
    const [nearbyData, setNearbyData] = useState(null);
    const [nearbyLoading, setNearbyLoading] = useState(false);

    const [apiRetryCount, setApiRetryCount] = useState(0);
    const lastAquiferParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });

    const isDefaultAquiferView = useMemo(() =>
        !isRainfall && !isWaterQuality && !isAquifer && !isWellInventory && !isGWRE && !isRechargeStructure,
        [isRainfall, isWaterQuality, isAquifer, isWellInventory, isGWRE, isRechargeStructure]
    );

    const activeMode = isAquifer || isWellInventory || isDefaultAquiferView || isGWRE;

    useEffect(() => {
        // Only reset to null and show loading if the core LOCATION (names) changed.
        if (activeMode && (
            lastAquiferParams.current.displayRegion !== displayRegion ||
            lastAquiferParams.current.displayBlock !== displayBlock ||
            lastAquiferParams.current.gp !== globalFilters?.gramPanchayat ||
            lastAquiferParams.current.v !== globalFilters?.village
        )) {
            setAquiferStats(null);
            setAquiferSpatialStats(null);
            setAquiferPolygons(null);
            setAquiferRecords([]);
            setYearlyTrends(null);
            setAquiferLoading(true);
            setSpatialStatsLoading(true);
            lastAquiferParams.current = { displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village };
        }
    }, [activeMode, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village]);

    useEffect(() => {
        let ignore = false;
        if (!activeMode) {
            setAquiferSpatialStats(null);
            return;
        }

        const fetchSpatialStats = async () => {
            setSpatialStatsLoading(true);
            try {
                // Use cache to avoid 22MB re-fetch
                let geojson;
                if (aquiferGeoJSONCache.data) {
                    geojson = aquiferGeoJSONCache.data;
                } else if (aquiferGeoJSONCache.promise) {
                    geojson = await aquiferGeoJSONCache.promise;
                } else {
                    aquiferGeoJSONCache.promise = fetch('/data/aquifer_opt.json')
                        .then(res => {
                            if (!res.ok) throw new Error(`Failed to load aquifer_opt.json: ${res.status}`);
                            return res.json();
                        })
                        .then(data => {
                            aquiferGeoJSONCache.data = data;
                            return data;
                        });
                    geojson = await aquiferGeoJSONCache.promise;
                }

                const features = geojson.features || [];
                let filtered = features;
                const turf = await import('@turf/turf');

                // Determine the target boundary for spatial filtering.
                // We prefer actual administrative boundaries (selectedBoundary or blockData)
                // over individual point markers to maintain regional context.
                let targetFeature = null;

                // 1. Explicit selection (e.g. from table or high-level click)
                if (selectedBoundary && selectedBoundary.geometry) {
                    targetFeature = selectedBoundary;
                }
                // 2. Clicked feature: ONLY use it if it's a polygon (aquifer_feature)
                // Skip for Points (well_inventory_well, piezometer, etc.) to avoid vanishing layer
                else if (neighbor && neighbor.geometry && neighbor.type === 'aquifer_feature') {
                    targetFeature = neighbor;
                }
                // 3. Fallback to current administrative block
                else if (displayBlock && blockData?.features) {
                    targetFeature = blockData.features.find(f => {
                        const props = f.properties || {};
                        if (props.is_parent || props.level === 'district') return false;
                        const bName = (props.BLOCK_NAME || props.Block || props.name || '').toString().trim().toUpperCase();
                        return bName === displayBlock.toString().trim().toUpperCase();
                    });
                }

                if (targetFeature) {
                    try {
                        const targetBbox = turf.bbox(targetFeature);
                        const [minLon, minLat, maxLon, maxLat] = targetBbox;

                        filtered = features.filter(f => {
                            if (!f.geometry) return false;
                            const fBbox = turf.bbox(f);
                            // Quick BBOX check for performance
                            if (fBbox[0] > maxLon || fBbox[2] < minLon || fBbox[1] > maxLat || fBbox[3] < minLat) {
                                return false;
                            }
                            try { return turf.booleanIntersects(targetFeature, f); } catch (e) { return true; }
                        });
                    } catch (e) {
                        console.warn('[AquiferStats] Strict spatial filter failed', e);
                    }
                } else if (displayRegion) {
                    // 4. Fallback to district if no block or point selected
                    const resolvedName = resolveAquiferDistrict(displayRegion);
                    const nameMatched = features.filter(f => {
                        const nd = (f.properties?.New_Dist || f.properties?.DIST_NAME || '').toUpperCase().trim();
                        return nd === resolvedName;
                    });

                    if (nameMatched.length > 0) {
                        filtered = nameMatched;
                    } else {
                        try {
                            let distGeo;
                            if (districtGeoJSONCache.data) {
                                distGeo = districtGeoJSONCache.data;
                            } else if (districtGeoJSONCache.promise) {
                                distGeo = await districtGeoJSONCache.promise;
                            } else {
                                districtGeoJSONCache.promise = fetch('/district.geojson')
                                    .then(res => {
                                        if (!res.ok) throw new Error(`Failed to load district.geojson: ${res.status}`);
                                        return res.json();
                                    })
                                    .then(data => {
                                        districtGeoJSONCache.data = data;
                                        return data;
                                    });
                                distGeo = await districtGeoJSONCache.promise;
                            }

                            const distFeature = (distGeo.features || []).find(f => {
                                const nm = (f.properties?.name || f.properties?.New_Dist || f.properties?.DIST_NAME || f.properties?.District || '').toUpperCase().trim();
                                return nm === displayRegion.toUpperCase().trim() || nm === resolvedName;
                            });

                            if (distFeature?.geometry) {
                                const targetBbox = turf.bbox(distFeature);
                                const [minLon, minLat, maxLon, maxLat] = targetBbox;

                                filtered = features.filter(f => {
                                    if (!f.geometry) return false;
                                    const fBbox = turf.bbox(f);
                                    if (fBbox[0] > maxLon || fBbox[2] < minLon || fBbox[1] > maxLat || fBbox[3] < minLat) {
                                        return false;
                                    }
                                    return true;
                                });
                            }
                        } catch (bdErr) {
                            console.warn('[AquiferStats] district.geojson fallback failed:', bdErr);
                        }
                    }
                }

                const aggregated = {};
                for (const f of filtered) {
                    const rawType = (f.properties?.Aquifer || f.properties?.aquifer || f.properties?.AQUIFER || f.properties?.Aquifer_Type || 'Unknown').toString().trim();
                    const aqType = normalizeAquiferName(rawType);
                    if (!aggregated[aqType]) aggregated[aqType] = { count: 0, area: 0 };
                    aggregated[aqType].count += 1;
                    const storedArea = parseFloat(f.properties?.Area || f.properties?.AREA || f.properties?.Area_SqKm || f.properties?.Shape_Area || 0) || 0;
                    aggregated[aqType].area += storedArea;
                }

                const distribution = Object.entries(aggregated)
                    .map(([name, s]) => ({ name, count: s.count, area: Math.round(s.area * 100) / 100 }))
                    .sort((a, b) => b.count - a.count);

                if (!ignore) {
                    const nextSpatialStats = {
                        layer_type: 'aquifer',
                        district: displayRegion || null,
                        total_count: distribution.reduce((s, d) => s + d.count, 0),
                        total_area: Math.round(distribution.reduce((s, d) => s + d.area, 0) * 100) / 100,
                        distribution
                    };

                    setAquiferSpatialStats(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(nextSpatialStats)) return prev;
                        return nextSpatialStats;
                    });

                    const nextPolygons = { type: 'FeatureCollection', features: filtered };
                    setAquiferPolygons(prev => {
                        // Using a simple features length check for performance instead of full JSON stringify
                        if (prev && prev.features?.length === nextPolygons.features.length) return prev;
                        return nextPolygons;
                    });

                    setSpatialStatsLoading(false);
                }
            } catch (err) {
                console.error('[AquiferStats] Client-side computation failed:', err);
                if (!ignore) setSpatialStatsLoading(false);
            }
        };

        fetchSpatialStats();
        return () => { ignore = true; };
    }, [activeMode, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, blockData, selectedBoundary, neighbor]);

    useEffect(() => {
        let ignore = false;
        const fetchAquiferData = async () => {
            if (!rajasthanId || !activeMode) {
                setAquiferLoading(false);
                return;
            }
            setAquiferLoading(true);
            try {
                const params = { year: globalFilters?.year || 2024 };
                if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
                else if (displayRegion) params.district = displayRegion;

                if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
                else if (displayBlock) params.block = displayBlock;

                if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
                else if (globalFilters?.gramPanchayat) params.gp_id = globalFilters.gramPanchayat;

                if (globalFilters?.village_id) params.village_id = globalFilters.village_id;
                else if (globalFilters?.village) params.village_name = globalFilters.village;

                // 1. Fetch Main Statistics
                const statsPromise = api.aquifer.getStatistics(params);

                // 2. Fetch Yearly Trends and Detailed Records if in Well Inventory mode
                let extraPromises = [Promise.resolve(null), Promise.resolve([])];
                if (isWellInventory) {
                    const yearlyParams = { ...params };
                    extraPromises = [
                        api.aquifer.getYearlyStatistics(yearlyParams).catch(() => null),
                        api.aquifer.getRecords({ ...params, detailed: 'true' }).catch(() => [])
                    ];
                }

                const [stats, trends, records] = await Promise.all([
                    statsPromise,
                    ...extraPromises
                ]);

                if (!ignore) {
                    setAquiferStats(stats);
                    if (isWellInventory) {
                        setYearlyTrends(trends);
                        setAquiferRecords(records);
                    }
                }
            } catch (error) {
                if (!ignore) {
                    console.error('Error fetching aquifer data:', error);
                    if (apiRetryCount < 3 && (!error.response || error.code === 'ERR_NETWORK')) {
                        setTimeout(() => { if (!ignore) setApiRetryCount(prev => prev + 1); }, 5000);
                    }
                }
            } finally {
                if (!ignore) setAquiferLoading(false);
            }
        };

        fetchAquiferData();
        return () => { ignore = true; };
    }, [activeMode, isWellInventory, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, globalFilters?.year, rajasthanId, apiRetryCount]);

    // Fetch Nearby wells separately when clickedLocation changes
    useEffect(() => {
        let ignore = false;
        if (!clickedLocation || !isWellInventory || (neighbor && neighbor.type === 'well_inventory_well')) {
            setNearbyData(null);
            return;
        }

        const fetchNearby = async () => {
            setNearbyLoading(true);
            try {
                const response = await api.aquifer.getNearby({
                    latitude: clickedLocation.lat,
                    longitude: clickedLocation.lng,
                    radius_km: 10
                });
                if (!ignore) setNearbyData(response && response.averages ? response : null);
            } catch (err) {
                console.error("Error fetching nearby aquifer data:", err);
            } finally {
                if (!ignore) setNearbyLoading(false);
            }
        };

        fetchNearby();
        return () => { ignore = true; };
    }, [clickedLocation, isWellInventory, neighbor]);

    const aquiferData = useMemo(() => {
        if (aquiferSpatialStats && aquiferSpatialStats.distribution) {
            const total = (aquiferSpatialStats.total_area > 0) ? aquiferSpatialStats.total_area : (aquiferSpatialStats.total_count || 1);
            const isArea = aquiferSpatialStats.total_area > 0;

            const result = aquiferSpatialStats.distribution.map(item => {
                const val = isArea ? item.area : item.count;
                return {
                    name: item.name,
                    value: val,
                    area: item.area,
                    count: item.count,
                    unit: isArea ? 'km²' : 'features',
                    percent: Math.round((val / total) * 1000) / 10,
                    color: getAquiferColor(item.name)
                };
            });
            return !displayRegion ? result.slice(0, 5) : result;
        }

        if (aquiferStats?.aquifer_distribution) {
            const totalWells = aquiferStats.summary.total_wells || 1;
            return aquiferStats.aquifer_distribution
                .map((aq) => ({
                    name: aq.aquifer || 'Unknown',
                    value: aq.count,
                    unit: 'Wells',
                    percent: Math.round((aq.count / totalWells) * 100),
                    color: getAquiferColor(aq.aquifer)
                }))
                .sort((a, b) => b.value - a.value);
        }
        return [];
    }, [aquiferStats, aquiferSpatialStats, displayRegion]);

    const waterLevelChartData = useMemo(() => {
        if (aquiferStats?.summary) {
            const s = aquiferStats.summary;
            return [
                { name: 'Pre-Monsoon', value: parseFloat((s.avg_pre_monsoon || 0).toFixed(2)), color: '#f4a261' },
                { name: 'Post-Monsoon', value: parseFloat((s.avg_pst_monsoon || 0).toFixed(2)), color: '#2a9d8f' },
                { name: 'Long Term Avg', value: parseFloat((s.avg_longterm || (s.avg_pre_monsoon * 1.1) || 0).toFixed(2)), color: '#457b9d' }
            ];
        }
        return [];
    }, [aquiferStats]);

    return {
        aquiferStats,
        aquiferLoading,
        aquiferSpatialStats,
        aquiferPolygons,
        spatialStatsLoading,
        aquiferData,
        waterLevelChartData,
        // New aggregated data
        aquiferRecords,
        yearlyTrends,
        nearbyData,
        nearbyLoading
    };
};
