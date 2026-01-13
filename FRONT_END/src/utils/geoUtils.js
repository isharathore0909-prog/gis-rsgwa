/**
 * Safely accesses GeoJSON feature properties with case insensitivity
 */
export const getFeatureProperty = (feature, key) => {
    if (!feature || !feature.properties) return undefined;
    if (feature.properties[key] !== undefined) return feature.properties[key];

    const lowerKey = key.toLowerCase();
    const keys = Object.keys(feature.properties);
    const match = keys.find(k => k.toLowerCase() === lowerKey);
    return match ? feature.properties[match] : undefined;
};

/**
 * Normalizes a string for comparison
 */
export const normalizeName = (name) => {
    return name?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
};

/**
 * Normalizes a string to uppercase and trimmed
 */
export const normalizeSearchName = (name) => {
    return name?.toString().trim().toUpperCase() || '';
};

/**
 * Calculates the distance between two coordinates in kilometers using Haversine formula
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

/**
 * Finds the nearest neighbors to a given point within a specified radius
 * @param {number} lat - Latitude of the point
 * @param {number} lng - Longitude of the point
 * @param {Array} data - Array of objects with lat and lng properties
 * @param {number} radiusKm - Search radius in kilometers (default 5km)
 * @param {number} limit - Maximum number of neighbors to return (default 5)
 */
export const getNeighbors = (lat, lng, data, radiusKm = 5, limit = 5) => {
    if (!data || !data.length) return [];

    const neighbors = data
        .map(item => {
            const itemLat = item.lat || item.latitude;
            const itemLng = item.lng || item.longitude;
            if (!itemLat || !itemLng) return null;

            const dist = calculateDistance(lat, lng, itemLat, itemLng);
            return { ...item, distance: dist };
        })
        .filter(item => item !== null && item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

    return neighbors;
};
