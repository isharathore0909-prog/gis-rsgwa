import { useMemo } from 'react';
import { parseWKT } from '../../utils/wktParser';
import { getPolygonCentroid } from '../../utils/mapUtils';
import { normalizeDistrictName } from '../../utils/namingUtils';

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
