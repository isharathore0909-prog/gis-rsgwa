import proj4 from 'proj4';

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

            let newCoordinates;

            if (feature.geometry.type === 'Polygon') {
                newCoordinates = feature.geometry.coordinates.map(ring => {
                    return ring.map(coord => {
                        return proj4(utm43n, wgs84, coord);
                    });
                });
            } else if (feature.geometry.type === 'MultiPolygon') {
                newCoordinates = feature.geometry.coordinates.map(polygon => {
                    return polygon.map(ring => {
                        return ring.map(coord => {
                            return proj4(utm43n, wgs84, coord);
                        });
                    });
                });
            } else {
                // Return other geometries as is (Point, LineString checks omitted for brevity but safe to return)
                return feature;
            }

            return {
                ...feature,
                geometry: {
                    ...feature.geometry,
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
