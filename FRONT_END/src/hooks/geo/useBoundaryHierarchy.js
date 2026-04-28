/**
 * useBoundaryHierarchy — WMS-Only Mode
 *
 * All map rendering is now done entirely via GeoServer WMS layers.
 * This hook NO LONGER fetches boundary GeoJSON from the database.
 * It only derives state/level info from the active filters so that
 * the rest of the app can react to drill-down changes without any
 * boundary payloads.
 */
import { useMemo } from 'react';

export const useBoundaryHierarchy = (filters) => {
    return useMemo(() => {
        const currentLevel = filters?.village
            ? 'village'
            : filters?.gramPanchayat
                ? 'gp'
                : filters?.block
                    ? 'block'
                    : 'district';

        const selectedLevel = filters?.village
            ? 'village'
            : filters?.gramPanchayat
                ? 'gp'
                : filters?.block
                    ? 'block'
                    : filters?.district
                        ? 'district'
                        : null;

        return {
            boundaries: null,         // No GeoJSON — WMS handles all rendering
            selectedBoundary: null,   // No GeoJSON highlights — WMS handles it
            selectedLevel,
            loading: false,
            error: null,
            currentLevel,
            hierarchy: {              // No GeoJSON — kept for API compatibility
                district: null,
                block: null,
                gp: null,
                village: null
            }
        };
    }, [
        filters?.district,
        filters?.block,
        filters?.gramPanchayat,
        filters?.village
    ]);
};

export default useBoundaryHierarchy;
