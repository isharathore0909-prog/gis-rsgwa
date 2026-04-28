import React, { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Pane } from 'react-leaflet';
import L from 'leaflet';

import './MapView.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, getAquiferColor } from '../../constants/mapConstants';

import { useMapDataFetch } from '../../hooks/data/useMapDataFetch';
import { useMapExport } from '../../hooks/ui/useMapExport';
import { useMapResize } from '../../hooks/ui/useMapResize';
import { useLegendData, useFeatureOptions, useMapView } from '../../hooks';
import { useAppContext } from '../../context/AppContext';

import { MapEvents, MapUpdater } from './MapEvents';
import MapLayerRenderer from './MapLayerRenderer';
import {
    MapControls, LegendToggle, LegendWidget, MapWarning, ColorPickerWidget, ExportLoadingOverlay
} from './Overlays';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapView = memo(({
    onLocationClick, blockBoundaryData, rajasthanData,
    currentLevel,
    rainfallPoints = [], rainfallDataSource = 'station', rainfallStations = [],
    rainfallStationRecords = [], initialShowLegend, onAddToTable, onFiltersApply,
    microData, selectedWellInventory = [], onToggleWellInventory,
    isDataAnalysisSidebarHidden, isLoading, searchCoordinates, exportTrigger,
    aquiferRecords = [], waterQualityRecords = []
}) => {
    const { filters, updateFilters, basemap, isControlsSidebarCollapsed, setClickedLocation, setMap, showColorPicker, setShowColorPicker } = useAppContext();

    // --- Core UI State ---
    const [showLegend, setShowLegend] = useState(true);
    const [numClasses, setNumClasses] = useState(5);
    const [vectorLoading, setVectorLoading] = useState(false);
    const [contourLoading, setContourLoading] = useState(false);

    const [layerColors, setLayerColors] = useState({
        canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722", dams: "#0ea5e9"
    });
    const handleColorChange = useCallback((layer, color) => setLayerColors(prev => ({ ...prev, [layer]: color })), []);

    // --- Legend Logic ---
    useEffect(() => { if (initialShowLegend) setShowLegend(true); }, [initialShowLegend]);

    const legendFeature = filters?.legendFeature || 'Category';

    useEffect(() => {
        const type = filters?.type;
        let targetFeature = 'Category';

        if (type === 'Rainfall') {
            targetFeature = 'avg_rainfall';
        } else if (type === 'Ground Water Resource Estimation') {
            targetFeature = 'Category';
        } else if (type === 'Water Quality') {
            targetFeature = 'status';
        }

        if (targetFeature !== filters?.legendFeature) {
            updateFilters({ legendFeature: targetFeature });
        }
    }, [filters?.type, filters?.legendFeature, updateFilters]);
    const toggleLegend = useCallback(() => setShowLegend(prev => !prev), []);

    // --- Stability Tracking ---
    const prevTypeRef = useRef(filters?.type);
    const [isLayerChanging, setIsLayerChanging] = useState(false);
    const layerChangeTimeoutRef = useRef(null);

    useEffect(() => {
        if (filters?.type !== prevTypeRef.current) {
            setIsLayerChanging(true);
            prevTypeRef.current = filters?.type;

            if (layerChangeTimeoutRef.current) clearTimeout(layerChangeTimeoutRef.current);
            layerChangeTimeoutRef.current = setTimeout(() => {
                setIsLayerChanging(false);
            }, 6000);
        } else if (!isLoading && isLayerChanging) {
            setIsLayerChanging(false);
            if (layerChangeTimeoutRef.current) {
                clearTimeout(layerChangeTimeoutRef.current);
                layerChangeTimeoutRef.current = null;
            }
        }
        return () => { if (layerChangeTimeoutRef.current) clearTimeout(layerChangeTimeoutRef.current); };
    }, [filters?.type, isLoading, isLayerChanging]);

    // --- Data Fetching Hook ---
    const {
        districtRainfall, districtRainfallLoading,
        dynamicRainfallStats, dynamicRainfallLoading,
        piezometerRecords, piezometersLoading,
        reprojectedGwreData, gwreLoading,
        raingaugeStations, raingaugeLoading,
        aggregatedRainfallPoints, stationRainfallPoints,
        damMarkers,
        validatedBlockData,
        selectedDistrictData,
        selectedBoundary
    } = useMapDataFetch({
        filters, rainfallPoints, blockBoundaryData: blockBoundaryData, rajasthanData,
        dynamicBoundaries: null, rainfallStations, rainfallStationRecords,
        legendFeature, isLoading
    });

    // --- GeoJSON Refs ---
    const blockGeoJsonRef = useRef(null);

    // --- Map View Logic ---
    const {
        map: mapInstance, mapRef, selectedDam, setSelectedDam, isRainfallDataEmpty,
        handleMapReady: handleMapReadyInternal, handleResetView, handleZoomIn, handleZoomOut,
        handleFullscreen, onMapClick, handleLocationClick, setIgnoreNextClick
    } = useMapView({
        filters, onLocationClick, validatedBlockData,
        selectedBoundary, selectedDistrictData,
        rainfallPoints, searchCoordinates,
        districtRainfall, isLoading, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden
    });

    const handleMapReady = useCallback((m) => {
        handleMapReadyInternal(m);
        setMap(m);
    }, [handleMapReadyInternal, setMap]);

    // --- Feature Hooks ---
    useMapResize(mapInstance, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden);
    const { handleExport, isExporting } = useMapExport(mapInstance, filters, exportTrigger);

    const featureOptions = useFeatureOptions(filters?.type);
    const legendData = useLegendData(filters, legendFeature, numClasses, validatedBlockData, reprojectedGwreData, aggregatedRainfallPoints, waterQualityRecords, aquiferRecords, districtRainfall);

    // Auto-reset view to Rajasthan on layer switch
    useEffect(() => { if (filters?.type) handleResetView(); }, [filters?.type]);

    // Reset view when navigating back to state level (district cleared)
    useEffect(() => {
        if (!filters?.district && !filters?.block) {
            handleResetView();
        }
    }, [filters?.district, filters?.block, handleResetView]);

    // Force map to invalidate size when switching from dashboard to full map
    const { viewMode } = useAppContext();
    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => {
                if (mapRef.current) mapRef.current.invalidateSize();
            }, 250);
        }
    }, [viewMode]);

    // --- Style & Filter Memos ---
    const canalFilter = useMemo(() => filters?.district ? {
        district: filters.district,
        districtId: filters.districtId,
        block: filters.block,
        blockId: filters.blockId,
        gramPanchayat: filters.gramPanchayat,
        gpId: filters.gpId,
        village: filters.village
    } : null, [filters?.district, filters?.districtId, filters.block, filters.blockId, filters.gramPanchayat, filters.gpId, filters.village]);

    const waterbodyFilter = useMemo(() => filters?.district ? {
        district: filters.district,
        districtId: filters.districtId,
        block: filters.block,
        blockId: filters.blockId,
        gramPanchayat: filters.gramPanchayat,
        gpId: filters.gpId,
        village: filters.village
    } : null, [filters?.district, filters?.districtId, filters.block, filters.blockId, filters.gramPanchayat, filters.gpId, filters.village]);

    const memoizedAquiferStyle = useMemo(() => (props) => ({
        fillColor: getAquiferColor(props.Aquifer || props.aquifer || ''),
        fillOpacity: 0.7, stroke: true, color: '#94a3b8', weight: 0.3, opacity: 1, fill: true
    }), []);

    const handleAquiferFeatureClick = useCallback((e) => {
        setIgnoreNextClick();
        const type = filters?.type;
        const features = type === 'Well Inventory' ? [] : [{ ...e.layer.properties, type: 'aquifer_feature' }];
        handleLocationClick(e.latlng, features);
    }, [filters?.type, handleLocationClick, setIgnoreNextClick]);

    const handleVectorLoading = useCallback((loading) => {
        setVectorLoading(loading);
    }, [setVectorLoading]);

    // --- Rendering ---
    const memoizedBasemap = useMemo(() => {
        const url = basemap === 'imagery-labels' || basemap === 'imagery'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : basemap === 'streets'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
        return (
            <>
                <TileLayer url={url} attribution='Tiles &copy; Esri' />
                {basemap === 'imagery-labels' && <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" zIndex={10} />}
            </>
        );
    }, [basemap]);

    return (
        <div className="map-container professional-border">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <MapUpdater center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} basemap={basemap} onMapReady={handleMapReady} />
                <MapEvents onLocationClick={onMapClick} />
                {memoizedBasemap}

                <MapLayerRenderer
                    filters={filters}
                    districtRainfall={districtRainfall}
                    legendFeature={legendFeature}
                    legendData={legendData}
                    onFiltersApply={onFiltersApply}
                    handleLocationClick={handleLocationClick}
                    validatedBlockData={validatedBlockData}
                    blockGeoJsonRef={blockGeoJsonRef}
                    damMarkers={damMarkers}
                    setSelectedDam={setSelectedDam}
                    onAddToTable={onAddToTable}
                    layerColors={layerColors}
                    raingaugeStations={raingaugeStations}
                    piezometerRecords={piezometerRecords}
                    waterQualityRecords={waterQualityRecords}
                    setContourLoading={setContourLoading}
                    aquiferRecords={aquiferRecords}
                    selectedWellInventory={selectedWellInventory}
                    memoizedAquiferStyle={memoizedAquiferStyle}
                    handleVectorLoading={handleVectorLoading}
                    handleAquiferFeatureClick={handleAquiferFeatureClick}
                    canalFilter={canalFilter}
                    waterbodyFilter={waterbodyFilter}
                    microData={microData}
                    currentLevel={currentLevel}
                />
            </MapContainer>

            {/* Only show the full-screen warning for major layer changes or initial load. Filter updates are silent. */}
            <MapWarning
                layerType={filters?.type}
                isRainfallDataEmpty={isRainfallDataEmpty}
                isLoading={isLoading || vectorLoading || contourLoading || isLayerChanging}
            />

            <MapControls onResetView={handleResetView} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFullscreen={handleFullscreen} onToggleColorPicker={() => setShowColorPicker(!showColorPicker)} showColorPickerBtn={filters?.type === 'Water Resources'} onExport={handleExport} />
            <ColorPickerWidget isActive={showColorPicker && filters?.type === 'Water Resources'} layerColors={layerColors} onColorChange={handleColorChange} onClose={() => setShowColorPicker(false)} />

            <LegendToggle isActive={filters?.type} showLegend={showLegend} hasData={legendData.length > 0} onToggle={toggleLegend} />
            <LegendWidget isActive={filters?.type} showLegend={showLegend} legendData={legendData} legendFeature={legendFeature} numClasses={numClasses} featureOptions={featureOptions} onFeatureChange={(feat) => updateFilters({ legendFeature: feat })} onClassesChange={setNumClasses} onHide={toggleLegend} />

            <ExportLoadingOverlay isActive={isExporting} />
        </div>
    );
});

export default MapView;
