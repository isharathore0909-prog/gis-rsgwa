import * as turf from '@turf/turf';
const { booleanIntersects, booleanPointInPolygon, bbox } = turf;

/**
 * Filter a FeatureCollection by an administrative boundary.
 * 
 * @param {Object} geoJson - The FeatureCollection to filter.
 * @param {Object} boundary - The GeoJSON Feature to filter by.
 * @param {Object} legacyFilter - Optional name-based filter {field, value, block, gp}.
 * @returns {Object} - Filtered FeatureCollection.
 */
export const filterGeoJsonByBoundary = (geoJson, boundary, legacyFilter = null) => {
    try {
        if (!geoJson?.features || !Array.isArray(geoJson.features)) return geoJson;

        let filtered = geoJson.features;

        // 1. Precise Spatial Filter (if boundary provided)
        if (boundary && boundary.geometry) {
            try {
                const boundaryBbox = bbox(boundary);

                filtered = filtered.filter(feature => {
                    if (!feature.geometry) return false;

                    // --- Fast BBox Pre-filter ---
                    let fBox;
                    // Use cached bbox if available (many apps add it during processing)
                    if (feature.bbox) {
                        fBox = feature.bbox;
                    } else {
                        // Quick iterative bbox calculation to avoid stack overflow
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        const coords = feature.geometry.coordinates;

                        function processCoords(c) {
                            if (typeof c[0] === 'number') {
                                if (c[0] < minX) minX = c[0];
                                if (c[1] < minY) minY = c[1];
                                if (c[0] > maxX) maxX = c[0];
                                if (c[1] > maxY) maxY = c[1];
                            } else {
                                for (let i = 0; i < c.length; i++) processCoords(c[i]);
                            }
                        }
                        processCoords(coords);
                        fBox = [minX, minY, maxX, maxY];
                        // Cache it for next pass
                        feature.bbox = fBox;
                    }

                    // Check for overlap [minX, minY, maxX, maxY]
                    const overlaps = boundaryBbox[0] <= fBox[2] && boundaryBbox[2] >= fBox[0] &&
                        boundaryBbox[1] <= fBox[3] && boundaryBbox[3] >= fBox[1];

                    if (!overlaps) return false;

                    // --- Expensive Precise Check ---
                    // For points, use booleanPointInPolygon
                    if (feature.geometry.type === 'Point') {
                        return booleanPointInPolygon(feature, boundary);
                    }

                    // For lines/polygons, check for intersection
                    return booleanIntersects(feature, boundary);
                });
            } catch (e) {
                console.warn('[spatialFilters] Turf spatial check failed:', e);
            }
        }

        // 2. Name-based Legacy Filter (refine the spatially-passed or whole set)
        if (legacyFilter && legacyFilter.field && legacyFilter.value) {
            const field = legacyFilter.field;
            const val = legacyFilter.value.toString().toUpperCase().trim();
            const blockVal = legacyFilter.block?.toString().toUpperCase().trim();
            const gpVal = legacyFilter.gp?.toString().toUpperCase().trim();
            const villageVal = legacyFilter.village?.toString().toUpperCase().trim();

            filtered = filtered.filter(f => {
                // If we already performed a precise spatial check and it PASSED,
                // we should be careful about letting a potentially missing/wrong name-attribute 
                // reject the feature. 
                // Strategy: If boundary exists, trust spatial intersection. 
                // Only apply name filter if NO boundary was provided (e.g. state overview or just district name search).
                if (boundary && boundary.geometry) return true;

                const p = f.properties;

                // District check
                const distVal = (p[field] || p.DIST_NAME || p.District || p.DISTRICT || p.DIST_N || '').toString().toUpperCase().trim();
                if (val && distVal !== val && distVal !== '') return false;

                // Block check
                if (blockVal) {
                    const bVal = (p.BLOCK_NAME || p.Block || p.BLOCK || p.block_name || p.taluka || '').toString().toUpperCase().trim();
                    if (bVal && bVal !== blockVal) return false;
                }

                // GP check
                if (gpVal) {
                    const gVal = (p.GP_NAME || p.GramPanchayat || p.GP || p.gp_name || '').toString().toUpperCase().trim();
                    if (gVal && gVal !== gpVal) return false;
                }

                // Village check
                if (villageVal) {
                    const vVal = (p.VILL_NAME || p.Village || p.VILLAGE || '').toString().toUpperCase().trim();
                    if (vVal && vVal !== villageVal) return false;
                }

                return true;
            });
        }

        return { ...geoJson, features: filtered };
    } catch (globalError) {
        console.error('[spatialFilters] Global filter error:', globalError);
        return geoJson; // Return unfiltered rather than crashing
    }
};

/**
 * Compute BBox for a GeoJSON feature (Leaflet-friendly format).
 * [minLon, minLat, maxLon, maxLat]
 */
export const getFeatureBbox = (feature) => {
    if (!feature || !feature.geometry) return null;
    try {
        const [minX, minY, maxX, maxY] = bbox(feature);
        return [minX, minY, maxX, maxY];
    } catch (e) {
        return null;
    }
};
