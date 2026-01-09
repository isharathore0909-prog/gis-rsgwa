/**
 * Lightweight WKT to GeoJSON parser for POINT, POLYGON and MULTIPOLYGON.
 * Handles the standard formats returned by PostGIS.
 */
export const parseWKT = (wkt) => {
    if (!wkt || typeof wkt !== 'string') return null;

    const trimmed = wkt.trim().toUpperCase();

    // Simple Point: POINT(75.5 26.8)
    if (trimmed.startsWith('POINT')) {
        const coords = trimmed.match(/\(([^)]+)\)/)?.[1].split(/\s+/);
        if (coords && coords.length >= 2) {
            return {
                type: 'Point',
                coordinates: [parseFloat(coords[0]), parseFloat(coords[1])]
            };
        }
    }

    // Polygon: POLYGON((75.1 26.1, ...))
    if (trimmed.startsWith('POLYGON')) {
        const ringsMatch = trimmed.match(/POLYGON\s*\((.*)\)/s);
        if (ringsMatch) {
            const content = ringsMatch[1].trim();
            // Split rings: (75.1 26.1, ...), (75.2 26.2, ...)
            const rings = content.split(/\)\s*,\s*\(/).map(ringStr => {
                return ringStr.replace(/[()]/g, '').trim().split(/\s*,\s*/).map(pair =>
                    pair.trim().split(/\s+/).map(Number)
                );
            });
            return { type: 'Polygon', coordinates: rings };
        }
    }

    // MultiPolygon: MULTIPOLYGON(((...)),((...)))
    if (trimmed.startsWith('MULTIPOLYGON')) {
        const contentMatch = trimmed.match(/MULTIPOLYGON\s*\((.*)\)/s);
        if (contentMatch) {
            const content = contentMatch[1].trim();
            const polygons = [];

            // Regex to find things like ((...)),((...))
            // We need to match nested groups. Since WKT MultiPolygon is (((...)),((...)))
            // the content inside outer brackets is ((...)),((...))

            let depth = 0;
            let start = 0;
            for (let i = 0; i < content.length; i++) {
                if (content[i] === '(') depth++;
                if (content[i] === ')') depth--;

                if (depth === 0 && content[i] !== ',' && content[i].trim()) {
                    // We found a polygon block ((...))
                    const polyStr = content.substring(start, i + 1).trim();
                    // Strip the outermost brackets from polyStr: ((...)) -> (...)
                    const innerPoly = polyStr.match(/^\s*\((.*)\)\s*$/s)?.[1].trim();
                    if (innerPoly) {
                        // Split rings like in Polygon
                        const rings = innerPoly.split(/\)\s*,\s*\(/).map(ringStr => {
                            return ringStr.replace(/[()]/g, '').trim().split(/\s*,\s*/).map(pair =>
                                pair.trim().split(/\s+/).map(Number)
                            );
                        });
                        polygons.push(rings);
                    }

                    // Skip following comma
                    while (i + 1 < content.length && (content[i + 1] === ',' || !content[i + 1].trim())) {
                        i++;
                    }
                    start = i + 1;
                }
            }

            return { type: 'MultiPolygon', coordinates: polygons };
        }
    }

    return null;
};
