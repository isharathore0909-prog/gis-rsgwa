import { useMemo } from 'react';
import { getFeatureProperty } from '../utils/geoUtils';
import { getPolygonCentroid } from '../utils/mapUtils';
import { DEFAULT_CENTER } from '../constants/mapConstants';

/**
 * Aggregates rainfall data by block for choropleth visualization
 */
export const useRainfallStatsByBlock = (rainfallPoints) => {
    return useMemo(() => {
        if (!rainfallPoints || !rainfallPoints.length) return {};

        const stats = {};
        rainfallPoints.forEach(p => {
            const block = (p.block_name || p.block || '').toString().trim().toUpperCase();
            const district = (p.district_name || p.district || '').toString().trim().toUpperCase();
            if (!block) return;

            const key = `${district}|${block}`;
            if (!stats[key]) stats[key] = { total: 0, count: 0 };

            const val = p.rainfall_mm ?? p.rainfall_in_mm ?? 0;
            stats[key].total += val;
            stats[key].count += 1;
        });

        return stats;
    }, [rainfallPoints]);
};

/**
 * Aggregates rainfall points by location (village level)
 */
export const useAggregatedRainfallPoints = (rainfallPoints, blockBoundaryData, isActive) => {
    return useMemo(() => {
        if (!isActive || !rainfallPoints.length) return [];

        // Build block centroids map
        const blockCentroids = {};
        if (blockBoundaryData?.features) {
            blockBoundaryData.features.forEach(f => {
                const bName = (f.properties.BLOCK_NAME || f.properties.Block || '').toUpperCase();
                const dName = (f.properties.DIST_NAME || f.properties.District || '').toUpperCase();
                blockCentroids[`${dName}|${bName}`] = getPolygonCentroid(f.geometry);
            });
        }

        // Aggregate by location
        const locationStats = {};
        rainfallPoints.forEach(p => {
            const vName = (p.village_name || p.village || 'Unknown').toUpperCase();
            const gpName = (p.gram_panchayat_name || p.gram_panchayat || p.gramPanchayat || 'Unknown').toUpperCase();
            const bName = (p.block_name || p.block || p.BLOCK_NAME || '').toUpperCase();
            const dName = (p.district_name || p.district || p.DIST_NAME || '').toUpperCase();
            const locKey = `${dName}|${bName}|${gpName}|${vName}`;

            if (!locationStats[locKey]) {
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

                locationStats[locKey] = {
                    ...p,
                    latitude: lat,
                    longitude: lng,
                    total_rainfall: 0,
                    count: 0,
                    isAggregated: true
                };
            }

            const val = p.rainfall_mm ?? p.rainfall_in_mm ?? 0;
            locationStats[locKey].total_rainfall += val;
            locationStats[locKey].count += 1;
        });

        return Object.values(locationStats).map(s => ({
            ...s,
            avg_rainfall: s.total_rainfall / s.count,
            rainfall_mm: s.total_rainfall / s.count
        }));
    }, [rainfallPoints, blockBoundaryData, isActive]);
};

/**
 * Generates dam markers with coordinates
 */
export const useDamMarkers = (isActive, damsData, blockBoundaryData, targetDistrict) => {
    return useMemo(() => {
        if (!isActive || !blockBoundaryData) return [];

        const normalize = (name) => name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const targetDist = normalize(targetDistrict);
        const relevantDams = targetDist
            ? damsData.filter(d => normalize(d.district) === targetDist)
            : damsData;

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
