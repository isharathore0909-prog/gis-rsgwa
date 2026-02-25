import { useMemo } from 'react';
import { getFeatureProperty } from '../utils/geoUtils';
import { parseWKT } from '../utils/wktParser';
import { reprojectGeoJSON } from '../utils/reproject';

/**
 * Validates and filters Rajasthan state boundary data
 */
export const useValidatedRajasthanData = (rajasthanData, filters, districtRainfall, legendFeature) => {
    return useMemo(() => {
        if (!rajasthanData) return null;

        // Inject district rainfall data for choropleth
        if (filters?.type === 'Rainfall') {
            const features = rajasthanData.features.map((f, index) => {
                const rawName = (f.properties.name || f.properties.New_Dist || f.properties.DIST_NAME || f.properties.District || '').toString();
                // Normalize to match data key
                const dName = rawName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

                // If dictionary has keys, we try lookup. 
                const hasData = Object.keys(districtRainfall).length > 0;
                let val = districtRainfall[dName];

                // Fix: Ensure we pass the value through even if falsy (0)
                if (val === undefined && hasData) val = 0; // Assume 0 if other districts have data

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

        const searchName = district.toString().trim().toUpperCase();

        // 1. Primary Source for Map Navigation: Static/Stable Rajasthan Data
        // Using this for fly-to ensures the map zooms immediately and stays there,
        // rather than jerking between rough and high-precision boundaries.
        const staticFeature = rajasthanData.features.find(f => {
            const p = f.properties;
            const distName = (p.name || p.New_Dist || p.DIST_NAME || p.district || p.dist_name || p.district_name || '')
                .toString().trim().toUpperCase();
            return distName === searchName;
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
                    (p.name || p.DIST_NAME || '').toString().trim().toUpperCase() === searchName;
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
        const sourceData = (filters?.type === 'Ground Water Resource Estimation' && gwreData)
            ? gwreData
            : blockBoundaryData;

        if (!sourceData || !filters?.district) return sourceData;

        const targetDist = filters.district.toString().trim().toUpperCase();

        // Filter features that belong to the district
        // AND exclude the parent object itself (so it isn't drawn as a block)
        const filteredFeatures = sourceData.features.filter(f => {
            const p = f.properties;

            // Skip parent features (district boundary) - these are for the highlight layer
            if (p.is_parent === true || p.level === 'district') return false;

            const dName = (p.DIST_NAME || p.District || p.district_name || p.district || p.dist_name || '').toString();
            return dName.trim().toUpperCase() === targetDist;
        });

        // Fallback to district boundary if no blocks found
        if (filteredFeatures.length === 0 && rajasthanData) {
            const distBoundary = rajasthanData.features.filter(f => {
                const distName = (f.properties.name || f.properties.New_Dist || f.properties.DIST_NAME ||
                    f.properties.District || '')?.toUpperCase();
                return distName === targetDist;
            });

            if (distBoundary.length > 0) {
                return {
                    type: 'FeatureCollection',
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

        return { ...sourceData, features: filteredFeatures };
    }, [blockBoundaryData, gwreData, filters?.district, filters?.type, rajasthanData, legendFeature]);
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
                const bName = (f.properties.BLOCK_NAME || f.properties.Block || '')
                    .toString().trim().toUpperCase();
                const dName = (f.properties.DIST_NAME || f.properties.District ||
                    f.properties.district_name || '').toString().trim().toUpperCase();
                const key = `${dName}|${bName}`;
                const distKey = dName.replace(/[^A-Z0-9]/g, '');

                const stats = rainfallStatsByBlock[key];
                let val = stats ? stats.total / stats.count : null;

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

        return { ...filteredBlockData, features: valid };
    }, [filteredBlockData, filters?.type, rainfallStatsByBlock, districtRainfall, legendFeature]);
};

/**
 * Validates dynamic boundaries (drill-down)
 */
export const useValidatedBoundaries = (dynamicBoundaries) => {
    return useMemo(() => {
        if (!dynamicBoundaries?.features) return null;

        const validFeatures = dynamicBoundaries.features.map(feature => {
            if (typeof feature.geometry === 'string') {
                try {
                    const parsedGeom = parseWKT(feature.geometry.replace(/^SRID=\d+;/, ''));
                    return parsedGeom ? { ...feature, geometry: parsedGeom } : null;
                } catch (e) {
                    return null;
                }
            }
            return feature;
        }).filter(f => f?.geometry?.type && f.geometry.coordinates);

        return validFeatures.length ? { ...dynamicBoundaries, features: validFeatures } : null;
    }, [dynamicBoundaries]);
};
