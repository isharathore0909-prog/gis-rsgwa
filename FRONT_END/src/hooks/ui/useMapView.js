import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../constants/mapConstants';

/**
 * useMapView Hook
 * 
 * Centralizes state and interaction logic for the MapView component.
 */
export const useMapView = ({
    filters,
    onLocationClick,
    validatedBlockData,
    selectedDistrictData,
    validatedBoundaries,
    selectedBoundary,
    rainfallPoints,
    searchCoordinates,
    districtRainfall,
    isLoading = false,
    isControlsSidebarCollapsed = false,
    isDataAnalysisSidebarHidden = false
}) => {
    // --- Refs ---
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const ignoreMapClickRef = useRef(false);

    // Track the last flyer target to prevent redundant calls
    const lastFlyerTargetRef = useRef(null);

    // --- State ---
    const [selectedDam, setSelectedDam] = useState(null);
    const [clickedPosition, setClickedPosition] = useState(null);

    // --- Dam & Position Reset ---
    useEffect(() => {
        setSelectedDam(null);
    }, [filters?.type, filters?.district]);

    useEffect(() => {
        setClickedPosition(null);
    }, [filters?.type]);

    // --- Map Connectivity ---
    const handleMapReady = useCallback((mapInstance) => {
        mapRef.current = mapInstance;
        setMap(mapInstance);
    }, []);

    // --- Fly-To Logic ---
    useEffect(() => {
        if (!mapRef.current || !filters) return;
        const currentMap = mapRef.current;

        const flyToLayer = (data, targetId) => {
            try {
                if (!data) return false;

                // If this is exactly the same target as before, don't fly again
                if (targetId && lastFlyerTargetRef.current === targetId) return true;

                const bounds = L.geoJSON(data).getBounds();
                if (bounds.isValid()) {
                    // Use tighter padding for lower levels (GP/Village) for a deeper zoom
                    const isLowerLevel = !!(filters?.gramPanchayat || filters?.village);
                    currentMap.flyToBounds(bounds, {
                        paddingTopLeft: [isControlsSidebarCollapsed ? 10 : 330, 20],
                        paddingBottomRight: [isDataAnalysisSidebarHidden ? 10 : 350, 20],
                        duration: 1.0,
                        maxZoom: isLowerLevel ? 16 : 14
                    });

                    if (targetId) lastFlyerTargetRef.current = targetId;
                    return true;
                }
            } catch (err) {
                console.error('[useMapView] Fly-to error:', err);
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

        // Priority 3: Validated Block Boundary (for specific block zoom)
        if (validatedBlockData && filters.block && filters.type !== 'Ground Water Resource Estimation') {
            const targetId = `vbd-${filters.district}-${filters.block}`;
            if (flyToLayer(validatedBlockData, targetId)) return;
        }

        // Priority 4: Dynamic Boundaries collection
        if (validatedBoundaries) {
            const bId = validatedBoundaries.id || 'coll';
            if (flyToLayer(validatedBoundaries, `vb-${bId}`)) return;
        }
    }, [validatedBlockData, selectedDistrictData, validatedBoundaries, selectedBoundary, filters?.district, filters?.block, isLoading, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden]);

    // --- Coordinate Search Effect ---
    useEffect(() => {
        if (!mapRef.current || !searchCoordinates) return;
        const { lat, lng } = searchCoordinates;
        if (lat && lng) {
            mapRef.current.setView([lat, lng], 13, {
                animate: true,
                duration: 1.5
            });

            // Optional: Add a temporary marker or popup
            L.popup()
                .setLatLng([lat, lng])
                .setContent(`Location: ${lat}, ${lng}`)
                .openOn(mapRef.current);
        }
    }, [searchCoordinates]);

    // --- Handlers ---
    const handleLocationClick = useCallback((latlng, data) => {
        // Mark that a location click has been handled to prevent double-triggering from generic map click
        ignoreMapClickRef.current = true;
        setTimeout(() => { ignoreMapClickRef.current = false; }, 100);

        if (filters?.type === 'Well Inventory') {
            setClickedPosition(latlng);
        }
        if (onLocationClick) {
            onLocationClick(latlng, data);
        }
    }, [filters?.type, onLocationClick]);

    const onMapClick = useCallback((latlng, data) => {
        if (ignoreMapClickRef.current) {
            return;
        }

        // Special case: Allow click anywhere for Well Inventory layer
        // This enables fetching nearby well data trend for arbitrary locations (any lat lon)
        const allowEmptyClick = filters?.type === 'Well Inventory';

        // Only process clicks that have associated data (e.g. from layers or nearby markers)
        // unless we are in the special 'allowEmptyClick' mode
        if ((!data || data.length === 0) && !allowEmptyClick) {
            console.log("useMapView: Click ignored - no data");
            return;
        }
        console.log("useMapView: Processing click at", latlng, "Allow Empty:", allowEmptyClick);
        handleLocationClick(latlng, data);
    }, [handleLocationClick, filters]);

    const setIgnoreNextClick = useCallback(() => {
        ignoreMapClickRef.current = true;
        setTimeout(() => { ignoreMapClickRef.current = false; }, 200);
    }, []);

    const handleResetView = useCallback(() => {
        if (!mapRef.current) return;
        mapRef.current.fitBounds([
            [23.03, 69.30], // Southwest
            [30.22, 78.27]  // Northeast
        ], {
            paddingTopLeft: [isControlsSidebarCollapsed ? 10 : 330, 20],
            paddingBottomRight: [isDataAnalysisSidebarHidden ? 10 : 350, 20],
            animate: true,
            duration: 0.8
        });
    }, [isControlsSidebarCollapsed, isDataAnalysisSidebarHidden]);
    const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
    const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
    const handleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    // --- Data Status ---
    const isRainfallDataEmpty = useMemo(() => {
        if (filters?.type !== 'Rainfall') return false;

        // If we have points, it's not empty. 
        if (rainfallPoints && rainfallPoints.length > 0) return false;

        // If we have district choropleth data, it's also NOT empty.
        if (districtRainfall && Object.keys(districtRainfall).length > 0) return false;

        // If we have no points and no district data, it is empty.
        return true;
    }, [filters?.type, rainfallPoints, districtRainfall]);

    const showBlockBoundary = useMemo(() => {
        const isLayerActive = ['Ground Water Resource Estimation', 'Rainfall', 'Water Quality'].includes(filters?.type);
        return isLayerActive || !!selectedDistrictData || !!filters?.block;
    }, [filters?.type, selectedDistrictData, filters?.block]);

    return {
        map,
        mapRef,
        selectedDam,
        setSelectedDam,
        clickedPosition,
        isRainfallDataEmpty,
        showBlockBoundary,
        handleMapReady,
        handleResetView,
        handleZoomIn,
        handleZoomOut,
        handleFullscreen,
        onMapClick,
        handleLocationClick,
        setIgnoreNextClick
    };
};
