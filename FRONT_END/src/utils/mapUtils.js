/**
 * Helper to calculate centroid of a polygon geometry
 */
export const getPolygonCentroid = (geometry) => {
    if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) return null;

    let coords = [];
    if (geometry.type === 'Polygon') {
        coords = geometry.coordinates[0];
    } else if (geometry.type === 'MultiPolygon') {
        coords = geometry.coordinates[0][0];
    } else {
        return null;
    }

    if (!coords || coords.length === 0) return null;

    let latSum = 0, lngSum = 0;
    // coords is array of [lng, lat]
    coords.forEach(c => {
        lngSum += c[0];
        latSum += c[1];
    });

    return {
        lat: latSum / coords.length,
        lng: lngSum / coords.length
    };
};

/**
 * Helper to get color for a value based on legend data
 */
export const getFeatureColor = (value, legendData) => {
    if (value === undefined || value === null) return '#ccc';

    // Check legend for categorical match first
    const categoricalMatch = legendData.find(item => item.isCategorical && item.value === value);
    if (categoricalMatch) return categoricalMatch.color;

    // Numeric Range Check
    for (const cls of legendData) {
        if (!cls.isCategorical) {
            const min = cls.min !== undefined ? cls.min : (cls.range ? cls.range[0] : -Infinity);
            const max = cls.max !== undefined ? cls.max : (cls.range ? cls.range[1] : Infinity);
            if (value >= min && value <= max + 0.001) {
                return cls.color;
            }
        }
    }

    // Fallback or out of bounds
    if (legendData.length > 0 && !legendData[0].isCategorical) {
        return legendData[legendData.length - 1]?.color || '#ccc';
    }
    return '#ccc';
};
