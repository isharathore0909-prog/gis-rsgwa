import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants/mapConstants';

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
    rainfallPoints,
    searchCoordinates
}) => {
    // --- Refs ---
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const ignoreMapClickRef = useRef(false);

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

        const flyToLayer = (data) => {
            try {
                if (!data) return false;
                const bounds = L.geoJSON(data).getBounds();
                if (bounds.isValid()) {
                    currentMap.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
                    return true;
                }
            } catch (err) {
                console.error('[useMapView] Fly-to error:', err);
            }
            return false;
        };

        if (validatedBlockData && filters.block && filters.type !== 'Ground Water Resource Estimation') {
            if (flyToLayer(validatedBlockData)) return;
        }

        if (selectedDistrictData && filters.district) {
            if (flyToLayer(selectedDistrictData)) return;
        }

        if (validatedBlockData && filters.district) {
            if (flyToLayer(validatedBlockData)) return;
        }

        if (validatedBoundaries) {
            flyToLayer(validatedBoundaries);
        }
    }, [validatedBlockData, selectedDistrictData, validatedBoundaries, filters?.district, filters?.block]);

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
        // Only process clicks that have associated data (e.g. from layers or nearby markers)
        // This prevents refreshes when clicking on empty map background or outside Rajasthan
        if (!data || data.length === 0) {
            return;
        }
        handleLocationClick(latlng, data);
    }, [handleLocationClick]);

    const setIgnoreNextClick = useCallback(() => {
        ignoreMapClickRef.current = true;
        setTimeout(() => { ignoreMapClickRef.current = false; }, 200);
    }, []);

    const handleResetView = useCallback(() => mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM), []);
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
        // We trust the backend-filtered rainfallPoints array.
        if (rainfallPoints && rainfallPoints.length > 0) return false;

        // If we have no points, it's potentially empty, but we might be loading.
        // For now, if active and truly 0, return true.
        return true;
    }, [filters?.type, rainfallPoints]);

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
