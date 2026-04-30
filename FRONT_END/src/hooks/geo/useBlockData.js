import { useMemo } from 'react';
import { normalizeDistrictName } from '../../utils/namingUtils';

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
