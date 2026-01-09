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
            if (!feature.geometry) return feature;

            let geometry = feature.geometry;

            // If geometry is WKT string, parse it first
            if (typeof geometry === 'string') {
                const parsed = parseWKT(geometry);
                if (parsed) {
                    geometry = parsed;
                } else {
                    return feature; // Can't parse, return as is
                }
            }

            let newCoordinates;

            if (geometry.type === 'Polygon') {
                newCoordinates = geometry.coordinates.map(ring => {
                    return ring.map(coord => {
                        // Check if already WGS84 (longitude usually 68-97 for India, latitude 8-37)
                        if (Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90) {
                            return coord;
                        }
                        return proj4(utm43n, wgs84, coord);
                    });
                });
            } else if (geometry.type === 'MultiPolygon') {
                newCoordinates = geometry.coordinates.map(polygon => {
                    return polygon.map(ring => {
                        return ring.map(coord => {
                            if (Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90) {
                                return coord;
                            }
                            return proj4(utm43n, wgs84, coord);
                        });
                    });
                });
            } else if (geometry.type === 'Point') {
                const coord = geometry.coordinates;
                if (Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90) {
                    newCoordinates = coord;
                } else {
                    newCoordinates = proj4(utm43n, wgs84, coord);
                }
            } else {
                return { ...feature, geometry }; // Not a polygon/point, but return parsed geometry if it was WKT
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
