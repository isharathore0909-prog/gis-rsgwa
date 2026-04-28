import { useEffect, useRef } from 'react';
import L from 'leaflet';

export const useMapCamera = (
    map,
    filters,
    isLoading,
    isControlsSidebarCollapsed,
    isDataAnalysisSidebarHidden,
    selectedBoundary,
    selectedDistrictData,
    validatedBlockData,
    validatedBoundaries,
    searchCoordinates
) => {
    const lastFlyerTargetRef = useRef(null);

    useEffect(() => {
        if (!map || !filters) return;

        const flyToLayer = (data, targetId) => {
            try {
                if (!data) return false;

                // If this is exactly the same target as before, don't fly again
                if (targetId && lastFlyerTargetRef.current === targetId) return true;

                const bounds = L.geoJSON(data).getBounds();
                if (bounds.isValid()) {
                    // Use tighter padding for lower levels (GP/Village) for a deeper zoom
                    const isLowerLevel = !!(filters?.gramPanchayat || filters?.village);
                    map.flyToBounds(bounds, {
                        paddingTopLeft: [isControlsSidebarCollapsed ? 10 : 330, 20],
                        paddingBottomRight: [isDataAnalysisSidebarHidden ? 10 : 350, 20],
                        duration: 1.0,
                        maxZoom: isLowerLevel ? 16 : 14
                    });

                    if (targetId) lastFlyerTargetRef.current = targetId;
                    return true;
                }
            } catch (err) {
                console.error('[useMapCamera] Fly-to error:', err);
            }
            return false;
        };

        // Priority 1: High-precision Drill-down Boundary
        if (selectedBoundary) {
            const p = selectedBoundary.properties || selectedBoundary.features?.[0]?.properties || {};
            const bId = selectedBoundary.id || (selectedBoundary.features?.[0]?.id) || p.code || p.name || 'fallback';
            const targetId = `sb-${bId}-${filters?.district}-${filters?.block}`;
            if (flyToLayer(selectedBoundary, targetId)) return;
        }

        // Priority 2: Selected District (Rough/Static Fallback) - Always prioritized for fast feedback
        if (selectedDistrictData && filters.district) {
            const targetId = `sdd-${filters.district}`;
            if (flyToLayer(selectedDistrictData, targetId)) return;
        }

        // Delay lower priority jumps if we are currently fetching high-precision data
        if (isLoading) return;

        // Priority 3: Validated Block Boundary (for specific block/district zoom)
        if (validatedBlockData && filters.block) {
            const targetId = `vbd-${filters.district}-${filters.block}`;
            if (flyToLayer(validatedBlockData, targetId)) return;
        }

        // Priority 4: Dynamic Boundaries collection
        if (validatedBoundaries) {
            const bId = validatedBoundaries.id || 'coll';
            if (flyToLayer(validatedBoundaries, `vb-${bId}`)) return;
        }
    }, [
        map,
        validatedBlockData,
        selectedDistrictData,
        validatedBoundaries,
        selectedBoundary,
        filters?.district,
        filters?.block,
        filters?.gramPanchayat,
        filters?.village,
        isLoading,
        isControlsSidebarCollapsed,
        isDataAnalysisSidebarHidden
    ]);

    // --- Coordinate Search Effect ---
    useEffect(() => {
        if (!map || !searchCoordinates) return;
        const { lat, lng } = searchCoordinates;
        if (lat && lng) {
            map.setView([lat, lng], 13, {
                animate: true,
                duration: 1.5
            });

            // Optional: Add a temporary marker or popup
            L.popup()
                .setLatLng([lat, lng])
                .setContent(`Location: ${lat}, ${lng}`)
                .openOn(map);
        }
    }, [map, searchCoordinates]);
};
