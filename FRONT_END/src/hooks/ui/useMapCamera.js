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
                        paddingTopLeft: [isControlsSidebarCollapsed ? 10 : 40, 20],
                        paddingBottomRight: [isDataAnalysisSidebarHidden ? 10 : 40, 20],
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

        // Primary Fly-To Target: GeoServer WFS Boundary Feature (District, Block, GP, or Village)
        if (selectedBoundary) {
            const p = selectedBoundary.properties || selectedBoundary.features?.[0]?.properties || {};
            const bId = selectedBoundary.id || (selectedBoundary.features?.[0]?.id) || p.code || p.name || 'fallback';
            const targetId = `wfs-${bId}-${filters?.district}-${filters?.block}-${filters?.gramPanchayat}-${filters?.village}`;
            if (flyToLayer(selectedBoundary, targetId)) return;
        }

        // Some legacy block records have no geometry in the location database.
        // The static block collection still supplies a usable boundary for a
        // precise camera fit in that case.
        if (filters?.block && validatedBlockData?.features?.length) {
            const selectedName = String(filters.block).trim().toUpperCase();
            const matchingFeature = validatedBlockData.features.find(feature => {
                const properties = feature?.properties || {};
                const name = properties.BLOCK_NAME || properties.block_name || properties.Block || properties.name;
                return String(name || '').trim().toUpperCase() === selectedName;
            });
            if (matchingFeature) {
                const targetId = `static-block-${filters?.districtId || filters?.district}-${filters?.blockId || filters.block}`;
                if (flyToLayer(matchingFeature, targetId)) return;
            }
        }

        // If a selected block has no polygon anywhere in the available sources,
        // retain useful geographic context by fitting its district instead of
        // leaving the user at the Rajasthan-wide default view.
        if (filters?.district && selectedDistrictData) {
            const targetId = `district-fallback-${filters?.districtId || filters.district}`;
            flyToLayer(selectedDistrictData, targetId);
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
