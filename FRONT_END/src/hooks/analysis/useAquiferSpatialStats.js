import { useState, useEffect } from 'react';
import { resolveAquiferDistrict } from '../../constants/districtAliases';
import { normalizeAquiferName } from '../../constants/mapConstants';

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

export const useAquiferSpatialStats = ({
    activeMode,
    displayRegion,
    displayBlock,
    blockData,
    selectedBoundary,
    neighbor,
    paramsChanged,
    hasAttemptedSpatialFetch,
    globalFilters,
    analysisLevel
}) => {
    const [aquiferSpatialStats, setAquiferSpatialStats] = useState(null);
    const [aquiferPolygons, setAquiferPolygons] = useState(null);
    const [isFetchingSpatial, setIsFetchingSpatial] = useState(false);

    const spatialStatsLoading = isFetchingSpatial || paramsChanged || (activeMode && !hasAttemptedSpatialFetch.current);

    useEffect(() => {
        if (activeMode && paramsChanged) {
            setAquiferSpatialStats(null);
            setAquiferPolygons(null);
        }
    }, [activeMode, paramsChanged]);

    useEffect(() => {
        let ignore = false;
        if (!activeMode) {
            setAquiferSpatialStats(null);
            hasAttemptedSpatialFetch.current = false;
            setIsFetchingSpatial(false);
            return;
        }

        const fetchSpatialStats = async () => {
            hasAttemptedSpatialFetch.current = true;
            setIsFetchingSpatial(true);
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
                let targetFeature = null;

                // 1. Explicit selection (e.g. from table or high-level click)
                if (selectedBoundary && selectedBoundary.geometry) {
                    targetFeature = selectedBoundary;
                }
                // 2. Clicked feature: ONLY use it if it's a polygon (aquifer_feature)
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
                } else if (analysisLevel !== 'State' && displayRegion) {
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
                        if (prev && prev.features?.length === nextPolygons.features.length) return prev;
                        return nextPolygons;
                    });

                    setIsFetchingSpatial(false);
                }
            } catch (err) {
                console.error('[AquiferStats] Client-side computation failed:', err);
                if (!ignore) setIsFetchingSpatial(false);
            }
        };

        fetchSpatialStats();
        return () => { ignore = true; };
    }, [activeMode, displayRegion, displayBlock, globalFilters, blockData, selectedBoundary, neighbor, hasAttemptedSpatialFetch, analysisLevel]);

    return {
        aquiferSpatialStats,
        aquiferPolygons,
        spatialStatsLoading
    };
};
