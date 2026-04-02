import { useMemo } from 'react';
import { getFeatureProperty } from '../../utils/geoUtils';
import { getPolygonCentroid } from '../../utils/mapUtils';
import { DEFAULT_CENTER } from '../../constants/mapConstants';
import { normalizeDistrictName } from '../../utils/namingUtils';

/**
 * Aggregates rainfall data by block for choropleth visualization
 */
export const useRainfallStatsByBlock = (rainfallPoints) => {
    return useMemo(() => {
        if (!rainfallPoints || !rainfallPoints.length) return {};

        // Group by Block -> Year
        const blockYears = {};

        rainfallPoints.forEach(p => {
            const block = (p.block_name || p.block || '').toString().trim().toUpperCase();
            const district = normalizeDistrictName(p.district_name || p.district || '');
            if (!block) return;

            const key = `${district}|${block}`;
            const year = p.date ? new Date(p.date).getFullYear() : 'unknown';

            if (!blockYears[key]) blockYears[key] = {};
            if (!blockYears[key][year]) blockYears[key][year] = 0;

            const val = p.rainfall_mm ?? p.rainfall_in_mm ?? 0;
            blockYears[key][year] += val;
        });

        // Calculate Average Annual Rainfall
        const stats = {};
        Object.keys(blockYears).forEach(key => {
            const years = Object.keys(blockYears[key]);
            const totalSum = years.reduce((acc, y) => acc + blockYears[key][y], 0);

            // We return { total, count } such that total/count = Average Annual
            stats[key] = {
                total: totalSum,
                count: years.length || 1
            };
        });

        return stats;
    }, [rainfallPoints]);
};

/**
 * Aggregates rainfall data by district for state-wide choropleth
 * Uses the same points already visible on the map for perfect parity
 */
export const useRainfallStatsByDistrict = (rainfallPoints) => {
    return useMemo(() => {
        if (!rainfallPoints || !rainfallPoints.length) return {};

        const distStats = {};
        rainfallPoints.forEach(p => {
            const dist = normalizeDistrictName(p.district_name || p.district || p.dist_name || p.district_name || p.DIST_NAME || '');
            if (!dist) return;

            if (!distStats[dist]) distStats[dist] = { total: 0, count: 0 };
            const val = p.rainfall_mm ?? p.rainfall_in_mm ?? 0;
            distStats[dist].total += val;
            distStats[dist].count += 1;
        });

        const stats = {};
        Object.keys(distStats).forEach(key => {
            stats[key] = distStats[key].total / distStats[key].count;
        });

        return stats;
    }, [rainfallPoints]);
};

/**
 * Aggregates rainfall points by location (village level)
 * Calculates Average Annual Rainfall to match District layer scale
 */
export const useAggregatedRainfallPoints = (rainfallPoints, blockBoundaryData, isActive) => {
    return useMemo(() => {
        if (!isActive || !rainfallPoints.length) return [];

        // Build block centroids map
        const blockCentroids = {};
        if (blockBoundaryData?.features) {
            blockBoundaryData.features.forEach(f => {
                const bName = (f.properties.BLOCK_NAME || f.properties.Block || '').toUpperCase();
                const dName = normalizeDistrictName(f.properties.DIST_NAME || f.properties.District || '');
                blockCentroids[`${dName}|${bName}`] = getPolygonCentroid(f.geometry);
            });
        }

        // Group by Location -> Year
        const locationYears = {};
        const locationMeta = {};

        rainfallPoints.forEach(p => {
            const vName = (p.village_name || p.village || 'Unknown').toUpperCase();
            const gpName = (p.gram_panchayat_name || p.gram_panchayat || p.gramPanchayat || 'Unknown').toUpperCase();
            const bName = (p.block_name || p.block || p.BLOCK_NAME || '').toUpperCase();
            const dName = normalizeDistrictName(p.district_name || p.district || p.DIST_NAME || '');
            const locKey = `${dName}|${bName}|${gpName}|${vName}`;

            if (!locationMeta[locKey]) {
                let lat = p.latitude;
                let lng = p.longitude;

                // Generate jittered coordinates if missing
                if (!lat || !lng) {
                    const center = blockCentroids[`${dName}|${bName}`];
                    const hash = locKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const jitterLat = ((hash % 10) - 5) * 0.005;
                    const jitterLng = (((hash * 7) % 10) - 5) * 0.005;
                    lat = center ? center.lat + jitterLat : DEFAULT_CENTER[0] + jitterLat;
                    lng = center ? center.lng + jitterLng : DEFAULT_CENTER[1] + jitterLng;
                }

                locationMeta[locKey] = {
                    ...p,
                    latitude: lat,
                    longitude: lng,
                    isAggregated: true
                };
            }

            const year = p.date ? new Date(p.date).getFullYear() : 'unknown';
            if (!locationYears[locKey]) locationYears[locKey] = {};
            if (!locationYears[locKey][year]) locationYears[locKey][year] = 0;

            const val = p.rainfall_mm ?? p.rainfall_in_mm ?? 0;
            locationYears[locKey][year] += val;
        });

        return Object.keys(locationMeta).map(key => {
            const years = Object.values(locationYears[key]);
            const totalSum = years.reduce((a, b) => a + b, 0);
            const avgAnnual = totalSum / (years.length || 1);

            return {
                ...locationMeta[key],
                avg_rainfall: avgAnnual,
                rainfall_mm: avgAnnual,
                total_records: years.length // Just for reference
            };
        });
    }, [rainfallPoints, blockBoundaryData, isActive]);
};

/**
 * Generates dam markers with coordinates
 */
export const useDamMarkers = (isActive, damsData, blockBoundaryData, targetDistrict, targetBlock) => {
    return useMemo(() => {
        if (!isActive || !blockBoundaryData) return [];

        const normalize = (name) => name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const targetDistArr = targetDistrict ? (Array.isArray(targetDistrict) ? targetDistrict : [targetDistrict]) : [];
        const normalizedTargetDistricts = targetDistArr.map(normalize);
        const normalizedTargetBlock = normalize(targetBlock);

        const relevantDams = damsData.filter(d => {
            const damDist = normalize(d.district);
            const damBlock = normalize(d.block);

            const distMatch = normalizedTargetDistricts.length === 0 || normalizedTargetDistricts.includes(damDist);
            const blockMatch = !normalizedTargetBlock || damBlock === normalizedTargetBlock;

            return distMatch && blockMatch;
        });

        // Build block geometry map
        const blockGeoMap = {};
        blockBoundaryData.features.forEach(f => {
            const dist = normalize(f.properties.DIST_NAME || f.properties.District);
            const block = normalize(f.properties.BLOCK_NAME || f.properties.Block);
            if (dist && block) {
                if (!blockGeoMap[dist]) blockGeoMap[dist] = {};
                blockGeoMap[dist][block] = f.geometry;
            }
        });

        return relevantDams.map(dam => {
            const geom = blockGeoMap[normalize(dam.district)]?.[normalize(dam.block)];
            return geom ? { ...dam, coordinate: getPolygonCentroid(geom) } : null;
        }).filter(Boolean);
    }, [isActive, damsData, blockBoundaryData, targetDistrict]);
};
