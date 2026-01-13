import proj4 from 'proj4';
import { parseWKT } from './wktParser';

// Define the source projection (UTM Zone 43N)
const utm43n = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs";
const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";

export const reprojectGeoJSON = (geoJSON) => {
    console.log("Reprojecting GeoJSON...", geoJSON);
    if (!geoJSON || !geoJSON.features) {
        console.error("Invalid GeoJSON data provided to reprojectGeoJSON");
        return null;
    }

    try {
        const newFeatures = geoJSON.features.map(feature => {
            if (!feature || !feature.geometry) return feature;

            let geometry = feature.geometry;

            // If geometry is WKT string, parse it first
            if (typeof geometry === 'string') {
                try {
                    // Remove SRID prefix if present e.g. "SRID=4326;MULTIPOLYGON..."
                    const wkt = geometry.replace(/^SRID=\d+;/, '');
                    const parsed = parseWKT(wkt);
                    if (parsed) {
                        geometry = parsed;
                    } else {
                        console.warn("Could not parse WKT geometry string:", geometry);
                        return feature;
                    }
                } catch (e) {
                    console.error("Error parsing WKT in reprojector:", e);
                    return feature;
                }
            }

            let newCoordinates;

            const transformCoords = (coords) => {
                if (!Array.isArray(coords)) return coords;
                // If it's a coordinate pair [x, y]
                if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                    // Check if already WGS84 (longitude usually 68-97 for India, latitude 8-37)
                    if (Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90) {
                        return coords;
                    }
                    return proj4(utm43n, wgs84, coords);
                }
                // Recursively handle nested arrays
                return coords.map(c => transformCoords(c));
            };

            if (['Point', 'Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(geometry.type)) {
                newCoordinates = transformCoords(geometry.coordinates);
            } else {
                console.warn(`Geometry type ${geometry.type} not explicitly handled for reprojection`);
                return { ...feature, geometry };
            }

            return {
                ...feature,
                geometry: {
                    ...geometry,
                    coordinates: newCoordinates
                }
            };
        });

        const result = {
            ...geoJSON,
            features: newFeatures
        };
        console.log("Reprojection complete:", result);
        return result;
    } catch (error) {
        console.error("Error during reprojection:", error);
        return null;
    }
};
