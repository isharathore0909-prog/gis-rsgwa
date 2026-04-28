import { useState, useEffect, useMemo } from 'react';
import { getFeatureProperty } from '../../utils/geoUtils';
import { parseWKT } from '../../utils/wktParser';
import { reprojectGeoJSON } from '../../utils/reproject';
import { getPolygonCentroid } from '../../utils/mapUtils';
import { normalizeDistrictName } from '../../utils/namingUtils';
import api from '../../api';

/**
 * Custom hook to fetch the specific geometry of the selected unit (Block, GP, Village) for zooming.
 */
export const useSelectedBoundaryGeometry = (filters) => {
    const [boundary, setBoundary] = useState(null);
    const [loading, setLoading] = useState(false);

    const activeLevel = filters?.village ? 'village' : (filters?.gramPanchayat ? 'gp' : (filters?.block ? 'block' : null));
    const activeCode = filters?.vlgCode || filters?.gpCode || filters?.blockCode;
    const activeId = filters?.vlgId || filters?.gpId || filters?.blockId;

    useEffect(() => {
        if (!activeLevel || (!activeCode && !activeId)) {
            setBoundary(null);
            return;
        }

        let ignore = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch high-precision boundary by code/id
                const params = { layer: activeLevel };
                if (activeCode) params.code = activeCode;
                if (activeId) params.id = activeId;

                const result = await api.location.getBoundaryByCode(params);
                if (!ignore && result) {
                    setBoundary(result);
                }
            } catch (err) {
                console.error('[useSelectedBoundaryGeometry] Error:', err);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [activeLevel, activeCode]);

    return { boundary, loading };
};

/**
 * Validates and filters Rajasthan state boundary data
 */
export const useValidatedRajasthanData = (rajasthanData, filters, districtRainfall, legendFeature) => {
    return useMemo(() => {
        if (!rajasthanData) return null;

        // Inject district rainfall data for choropleth
        if (filters?.type === 'Rainfall') {
            const features = rajasthanData.features.map((f, index) => {
                const rawName = f.properties.New_Dist || f.properties.name || f.properties.DIST_NAME || f.properties.District || '';
                const dName = normalizeDistrictName(rawName);
                const hasData = Object.keys(districtRainfall).length > 0;
                let val = districtRainfall[dName];

                if (val === undefined && hasData) {
                    const altKey = rawName.toString().toUpperCase().replace(/[^A-Z]/g, '');
                    val = districtRainfall[altKey];
                }

                if ((val === undefined || val === null || isNaN(val)) && hasData) val = 0;

                return {
                    ...f,
                    properties: {
                        ...f.properties,
                        avg_rainfall: val,
                        rainfall_mm: val,
                        // Ensure legacy match for 'avg_rainfall' or whatever legendFeature calls for
                        [legendFeature]: val
                    }
                };
            });

            return { ...rajasthanData, features };
        }

        return (rajasthanData.type === 'Feature' || rajasthanData.type === 'FeatureCollection')
            ? rajasthanData
            : null;
    }, [rajasthanData, filters?.type, districtRainfall, legendFeature]);
};

/**
 * Filters district boundary data
 * Prioritizes dynamic DB-fetched boundary if available to ensure alignment with children.
 */
export const useSelectedDistrictData = (rajasthanData, district, dynamicBoundaries, blockBoundaryData, isLoading = false) => {
    return useMemo(() => {
        if (!district || !rajasthanData) return null;

        const searchName = normalizeDistrictName(district);

        // 1. Primary Source for Map Navigation: Static/Stable Rajasthan Data
        // Using this for fly-to ensures the map zooms immediately and stays there,
        // rather than jerking between rough and high-precision boundaries.
        const staticFeature = rajasthanData.features.find(f => {
            const p = f.properties;
            const distName = p.New_Dist || p.name || p.DIST_NAME || p.district || p.dist_name || p.district_name || '';
            return normalizeDistrictName(distName) === searchName;
        });

        if (staticFeature) {
            return { type: 'FeatureCollection', features: [staticFeature] };
        }

        // 2. Fallback: Check blockBoundaryData or dynamicBoundaries if static doesn't have it
        const findInCollection = (collection) => {
            if (!collection?.features) return null;
            return collection.features.find(f => {
                const p = f.properties;
                return (p.is_parent === true || p.level === 'district') &&
                    normalizeDistrictName(p.name || p.DIST_NAME || '') === searchName;
            });
        };

        const dbFeature = findInCollection(blockBoundaryData) || findInCollection(dynamicBoundaries);

        if (dbFeature) {
            return { type: 'FeatureCollection', features: [dbFeature] };
        }

        return null;
    }, [rajasthanData, district, dynamicBoundaries, blockBoundaryData]);
};

/**
 * Filters and validates block boundary data
 */
export const useFilteredBlockData = (blockBoundaryData, gwreData, filters, rajasthanData, legendFeature) => {
    return useMemo(() => {
        // Priority order for GWRE: 1. DB source (if loaded), 2. Static source (fallback)
        const isGWRE = filters?.type === 'Ground Water Resource Estimation';
        const hasGwreData = gwreData?.features?.length > 0;
        const sourceData = isGWRE && hasGwreData ? gwreData : blockBoundaryData;
        const sourceTag = (isGWRE && hasGwreData) ? 'db' : 'static';

        if (!sourceData) return null;

        // 1. If no district is selected, return the whole (but cleaned) source collection
        if (!filters?.district) {
            if (isGWRE) {
                const cleaned = sourceData.features.filter(f =>
                    f.properties.level !== 'district' && f.properties.is_parent !== true
                );
                return { ...sourceData, features: cleaned, source: sourceTag };
            }
            return { ...sourceData, source: sourceTag };
        }

        // 2. District filtering logic
        const searchDist = normalizeDistrictName(filters.district);
        const filteredFeatures = sourceData.features.filter(f => {
            const p = f.properties;
            // Skip parent features (district boundary) - these are for the highlight layer
            if (p.is_parent === true || p.level === 'district') return false;

            const dName = (p.DIST_NAME || p.District || p.district_name || p.district || p.dist_name || p.DISTRICT_N || '').toString();
            return normalizeDistrictName(dName) === searchDist;
        });

        // Fallback to district boundary if no blocks found
        if (filteredFeatures.length === 0 && rajasthanData) {
            const distBoundary = rajasthanData.features.filter(f => {
                const p = f.properties;
                const distName = p.name || p.New_Dist || p.DIST_NAME || p.District || p.district || p.dist_name || p.district_name || '';
                return normalizeDistrictName(distName) === searchDist;
            });

            if (distBoundary.length > 0) {
                return {
                    type: 'FeatureCollection',
                    source: sourceTag,
                    features: distBoundary.map(f => ({
                        ...f,
                        properties: {
                            ...f.properties,
                            BLOCK_NAME: `District: ${filters.district}`,
                            [legendFeature]: "No Data"
                        }
                    }))
                };
            }
        }

        return {
            ...sourceData,
            features: filteredFeatures,
            source: sourceTag
        };
    }, [blockBoundaryData, gwreData, filters?.district, filters?.type, rajasthanData, legendFeature]);
};

const normalizeGWRECategory = (name) => {
    if (!name) return 'Unknown';
    const catLower = name.toString().toLowerCase().trim();
    if (catLower.includes('over') && catLower.includes('exploited')) return 'Over Exploited';
    if (catLower.includes('semi') && catLower.includes('critical')) return 'Semi Critical';
    if (catLower.includes('critical')) return 'Critical';
    if (catLower.includes('safe')) return 'Safe';
    if (catLower.includes('saline')) return 'Saline';
    return name;
};

/**
 * Validates block data and injects rainfall statistics
 */
export const useValidatedBlockData = (filteredBlockData, filters, rainfallStatsByBlock, districtRainfall, legendFeature) => {
    return useMemo(() => {
        if (!filteredBlockData?.features) return null;

        const valid = filteredBlockData.features.filter(f =>
            f?.geometry?.type && f.geometry.coordinates
        );

        if (!valid.length) return null;

        // Inject rainfall data if applicable
        if (filters?.type === 'Rainfall') {
            const featuresWithRainfall = valid.map(f => {
                const bName = (f.properties.BLOCK_NAME || f.properties.Block || f.properties.BLOCK_NAME || '')
                    .toString().trim().toUpperCase();
                const dName = normalizeDistrictName(f.properties.New_Dist || f.properties.name || f.properties.DIST_NAME || f.properties.District ||
                    f.properties.district_name || f.properties.DISTRICT_N || '');
                const key = `${dName}|${bName}`;
                const distKey = dName.replace(/[^A-Z0-9]/g, '');

                const stats = rainfallStatsByBlock ? rainfallStatsByBlock[key] : null;
                const directStats = rainfallStatsByBlock ? rainfallStatsByBlock[bName] : null;

                let val = null;
                if (stats !== undefined && stats !== null) {
                    val = typeof stats === 'object' ? stats.total / stats.count : stats;
                } else if (directStats !== undefined && directStats !== null) {
                    val = typeof directStats === 'object' ? directStats.total / directStats.count : directStats;
                }

                // Fallback to district average if block-level records are missing
                if ((val === null || val === undefined) && districtRainfall && districtRainfall[distKey]) {
                    val = districtRainfall[distKey];
                }

                return {
                    ...f,
                    properties: {
                        ...f.properties,
                        avg_rainfall: val,
                        rainfall_mm: val,
                        [legendFeature]: val
                    }
                };
            });

            return { ...filteredBlockData, features: featuresWithRainfall };
        }

        // Standardize GWRE properties to ensure categorical styling works consistently
        if (filters?.type === 'Ground Water Resource Estimation') {
            const featuresWithGWRE = valid.map((f, i) => {
                const p = f.properties || {};
                // Normalize the category value so legend matching is reliable
                // Priority: 1. Category, 2. block_status, 3. exploitation, 4. status, 5. GWDL
                const rawCategory = p.Category || p.category ||
                    p.block_status || p.block_stat ||
                    p.exploitation_status || p.exploitation ||
                    p.status || p.GWDL || p.gwdl || 'No Data';

                // Normalizing category to ensure exact matching with legend labels
                const normalizedCategory = normalizeGWRECategory(rawCategory);

                // Use the legend feature from filters if available, default to 'Category'
                const legendKey = filters?.legendFeature || 'Category';

                return {
                    ...f,
                    type: 'Feature',
                    properties: {
                        ...p,
                        Category: normalizedCategory,
                        [legendKey]: normalizedCategory,
                        _categoryNormalized: true
                    }
                };
            });
            return {
                ...filteredBlockData,
                features: featuresWithGWRE,
                source: filteredBlockData.source || 'db',
                lastUpdated: Date.now()
            };
        }

        return { ...filteredBlockData, features: valid };
    }, [filteredBlockData, filters?.type, filters?.legendFeature, rainfallStatsByBlock, districtRainfall, legendFeature]);
};

/**
 * Validates dynamic boundaries (drill-down) and injects rainfall data
 */
export const useValidatedBoundaries = (dynamicBoundaries, filters, dynamicRainfallStats, drillLevel, legendFeature, stationRainfallPoints) => {
    return useMemo(() => {
        if (!dynamicBoundaries?.features) return null;

        const validFeatures = dynamicBoundaries.features.map(feature => {
            let processedFeature = feature;
            if (typeof feature.geometry === 'string') {
                try {
                    const parsedGeom = parseWKT(feature.geometry.replace(/^SRID=\d+;/, ''));
                    processedFeature = parsedGeom ? { ...feature, geometry: parsedGeom } : null;
                } catch (e) {
                    return null;
                }
            }
            if (!processedFeature) return null;

            // Inject rainfall data for the current drill-down level OR the parent level
            const isTargetLevel = processedFeature.properties.level === drillLevel;
            const isParentMatch = processedFeature.properties.is_parent && processedFeature.properties.level === (filters?.village ? 'village' : (filters?.gramPanchayat ? 'gp' : (filters?.block ? 'block' : 'district')));

            if (filters?.type === 'Rainfall' && dynamicRainfallStats && (isTargetLevel || isParentMatch)) {
                const targetName = (processedFeature.properties.name || processedFeature.properties.BLOCK_NAME || processedFeature.properties.vllg_name || processedFeature.properties.v_name || '').toString().trim().toUpperCase();
                const fLevel = processedFeature.properties.level;
                let locKey = targetName;

                // Construct composite key to match what the backend sent
                if (fLevel === 'gp' || (fLevel === 'village' && !isParentMatch)) {
                    if (fLevel === 'gp') {
                        const parentBlock = normalizeDistrictName(processedFeature.properties.block_name || processedFeature.properties.block || filters.block);
                        locKey = `${parentBlock}|${targetName}`;
                    } else {
                        const parentGP = normalizeDistrictName(processedFeature.properties.grampanchayat_name || processedFeature.properties.grampanchayat || filters.gramPanchayat);
                        locKey = `${parentGP}|${targetName}`;
                    }
                }

                let val = dynamicRainfallStats[locKey];

                // Fallback to strict name if composite fails
                if (val === undefined) {
                    val = dynamicRainfallStats[targetName];
                }

                // If completely empty (no API data) but we are at GP/Village level, use Nearest Neighbor
                if (val === undefined && stationRainfallPoints && stationRainfallPoints.length > 0 && (drillLevel === 'gp' || drillLevel === 'village')) {
                    try {
                        const centroid = getPolygonCentroid(processedFeature.geometry);

                        if (centroid && centroid.lat && centroid.lng) {
                            let nearestStation = null;
                            let minDistance = Infinity;

                            stationRainfallPoints.forEach(station => {
                                if (station.latitude && station.longitude) {
                                    // Rough Pythagorean distance for speed (since we just need nearest)
                                    const dist = Math.pow(station.latitude - centroid.lat, 2) + Math.pow(station.longitude - centroid.lng, 2);
                                    if (dist < minDistance) {
                                        minDistance = dist;
                                        nearestStation = station;
                                    }
                                }
                            });

                            if (nearestStation && nearestStation.record_count > 0) {
                                val = nearestStation.total_rainfall / nearestStation.record_count;
                                // Log to help debugging empty matches
                            }
                        }
                    } catch (e) {
                        console.warn('Fallback calc failed', e);
                    }
                }

                return {
                    ...processedFeature,
                    properties: {
                        ...processedFeature.properties,
                        avg_rainfall: val,
                        rainfall_mm: val,
                        [legendFeature]: val
                    }
                };
            }

            return processedFeature;
        }).filter(f => f?.geometry?.type && f.geometry.coordinates);

        return validFeatures.length ? { ...dynamicBoundaries, features: validFeatures } : null;
    }, [dynamicBoundaries, filters?.type, dynamicRainfallStats, drillLevel, legendFeature, stationRainfallPoints]);
};
