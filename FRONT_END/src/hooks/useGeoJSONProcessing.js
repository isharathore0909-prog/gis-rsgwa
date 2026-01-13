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
        if (filters?.type === 'Rainfall' && Object.keys(districtRainfall).length > 0) {
            const features = rajasthanData.features.map(f => {
                const dName = (f.properties.New_Dist || f.properties.DIST_NAME || f.properties.District || '')
                    .toString().trim().toUpperCase();
                const val = districtRainfall[dName];
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
            return { ...rajasthanData, features };
        }

        return (rajasthanData.type === 'Feature' || rajasthanData.type === 'FeatureCollection')
            ? rajasthanData
            : null;
    }, [rajasthanData, filters?.type, districtRainfall, legendFeature]);
};

/**
 * Filters district boundary data
 */
export const useSelectedDistrictData = (rajasthanData, district) => {
    return useMemo(() => {
        if (!rajasthanData || !district) return null;

        const searchName = district.toString().trim().toUpperCase();
        const features = rajasthanData.features.filter(f => {
            const distName = (f.properties.New_Dist || f.properties.DIST_NAME || f.properties.district || '')
                .toString().trim().toUpperCase();
            return distName === searchName;
        });

        return features.length ? { ...rajasthanData, features } : null;
    }, [rajasthanData, district]);
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
        const filteredFeatures = sourceData.features.filter(f => {
            const dName = (f.properties.DIST_NAME || f.properties.District ||
                f.properties.district_name || f.properties.district || '').toString();
            return dName.trim().toUpperCase() === targetDist;
        });

        // Fallback to district boundary if no blocks found
        if (filteredFeatures.length === 0 && rajasthanData) {
            const distBoundary = rajasthanData.features.filter(f => {
                const distName = (f.properties.New_Dist || f.properties.DIST_NAME ||
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
export const useValidatedBlockData = (filteredBlockData, filters, rainfallStatsByBlock, legendFeature) => {
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
                const stats = rainfallStatsByBlock[key];
                const val = stats ? stats.total / stats.count : null;

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
    }, [filteredBlockData, filters?.type, rainfallStatsByBlock, legendFeature]);
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
