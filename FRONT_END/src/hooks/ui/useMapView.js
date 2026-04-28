import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMapCamera } from './useMapCamera';
import { useMapControls } from './useMapControls';

/**
 * useMapView Hook
 * 
 * Centralizes state and interaction logic for the MapView component.
 */
export const useMapView = ({
    filters,
    onLocationClick,
    validatedBlockData,
    selectedBoundary,
    selectedDistrictData,
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

    // --- State ---
    const [selectedDam, setSelectedDam] = useState(null);
    const [clickedPosition, setClickedPosition] = useState(null);

    // --- Hooks ---
    useMapCamera(
        map,
        filters,
        isLoading,
        isControlsSidebarCollapsed,
        isDataAnalysisSidebarHidden,
        selectedBoundary,
        selectedDistrictData,
        validatedBlockData,
        null, // validatedBoundaries
        searchCoordinates
    );

    const {
        handleResetView,
        handleZoomIn,
        handleZoomOut,
        handleFullscreen
    } = useMapControls(map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden);

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
            return;
        }
        handleLocationClick(latlng, data);
    }, [handleLocationClick, filters]);

    const setIgnoreNextClick = useCallback(() => {
        ignoreMapClickRef.current = true;
        setTimeout(() => { ignoreMapClickRef.current = false; }, 200);
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
        return isLayerActive || !!filters?.block;
    }, [filters?.type, filters?.block]);

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
