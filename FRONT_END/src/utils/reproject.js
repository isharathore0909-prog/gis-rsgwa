import proj4 from 'proj4';
import { parseWKT } from './wktParser';

// Define the source projection (UTM Zone 43N)
const utm43n = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs";
const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
const epsg3857 = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs";
// India Everest 1830 / UTM 43N - common for Rajasthan datasets
const everest43n = "+proj=utm +zone=43 +a=6377276.345 +b=6356075.413 +towgs84=295,736,257,0,0,0,0 +units=m +no_defs";

export const reprojectGeoJSON = (geoJSON) => {
    if (!geoJSON) return null;

    // Normalize input to handle FeatureCollection, Feature, or Geometry
    let features = [];
    let isSingleFeature = false;
    let isGeometryOnly = false;

    if (geoJSON.type === 'FeatureCollection') {
        features = geoJSON.features || [];
    } else if (geoJSON.type === 'Feature') {
        features = [geoJSON];
        isSingleFeature = true;
    } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(geoJSON.type)) {
        features = [{ type: 'Feature', properties: {}, geometry: geoJSON }];
        isGeometryOnly = true;
    } else if (geoJSON.features) {
        features = geoJSON.features;
    } else {
        console.error("Invalid GeoJSON data provided to reprojectGeoJSON", geoJSON);
        return null;
    }

    try {
        const newFeatures = features.map(feature => {
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
                    // Heuristic to distinguish between UTM 43N and Web Mercator
                    // UTM 43N Easting is typically 100k-900k
                    // Web Mercator X for India is typically 7M-10M
                    if (Math.abs(coords[0]) > 2000000) {
                        return proj4(epsg3857, wgs84, coords);
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

        if (isGeometryOnly) {
            return newFeatures[0].geometry;
        }
        if (isSingleFeature) {
            return newFeatures[0];
        }

        return {
            ...geoJSON,
            features: newFeatures
        };
    } catch (error) {
        console.error("Error during reprojection:", error);
        return null;
    }
};
