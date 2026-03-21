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
 * Helper to get color for a value based on legend data.
 *
 * Matching strategy for categorical items (in priority order):
 *  1. item.value  exact match          (legacy path)
 *  2. item.label  exact match          (case-insensitive)
 *  3. substring match either way       (handles "Over Exploited" / "Semi Critical" GWDL variants)
 */
export const getFeatureColor = (value, legendData) => {
    if (value === undefined || value === null) return '#ccc';
    if (!legendData || !legendData.length) return '#ccc';

    const strVal = String(value).trim().toLowerCase();

    // 1. Categorical matching
    for (const item of legendData) {
        if (!item.isCategorical) continue;

        // 1a. Exact value match (legacy)
        if (item.value !== undefined && item.value !== null) {
            if (String(item.value).trim().toLowerCase() === strVal) return item.color;
        }

        // 1b. Exact label match (case-insensitive)
        if (item.label !== undefined && item.label !== null) {
            if (String(item.label).trim().toLowerCase() === strVal) return item.color;
        }
    }

    // 1c. Substring match (handles GWDL variants like "Over Exploited" ↔ "over exploited")
    for (const item of legendData) {
        if (!item.isCategorical) continue;
        const lbl = String(item.label || item.value || '').trim().toLowerCase();
        if (!lbl || lbl === 'no data') continue;
        if (strVal.includes(lbl) || lbl.includes(strVal)) return item.color;
    }

    // 2. Numeric Range Check
    for (const cls of legendData) {
        if (!cls.isCategorical) {
            const min = cls.min !== undefined ? cls.min : (cls.range ? cls.range[0] : -Infinity);
            const max = cls.max !== undefined ? cls.max : (cls.range ? cls.range[1] : Infinity);
            if (value >= min && value <= max + 0.001) {
                return cls.color;
            }
        }
    }

    // 3. Fallback: last colour in numeric legends, or gray
    if (legendData.length > 0 && !legendData[0].isCategorical) {
        return legendData[legendData.length - 1]?.color || '#ccc';
    }
    return '#ccc';
};
