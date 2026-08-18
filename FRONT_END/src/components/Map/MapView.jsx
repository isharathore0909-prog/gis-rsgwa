import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';

import './MapView.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../constants/mapConstants';

import { useMapExport } from '../../hooks/ui/useMapExport';
import { useMapResize } from '../../hooks/ui/useMapResize';
import { useLegendData, useFeatureOptions, useMapView } from '../../hooks';
import { useAppContext } from '../../context/AppContext';

import { MapEvents, MapUpdater } from './MapEvents';
import MapLayerRenderer from './MapLayerRenderer';
import BasemapRenderer from './BasemapRenderer';
import {
    MapControls, LegendToggle, LegendWidget, MapWarning, ColorPickerWidget, ExportLoadingOverlay
} from './Overlays';
import { formatClickedFeatureInfo } from '../../utils/mapInfoFormatter';
import { getAquiferColor } from '../../constants/mapConstants';

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
    aquiferRecords = [], waterQualityRecords = [], mapData
}) => {
    const { filters, updateFilters, basemap, isControlsSidebarCollapsed, setMap, showColorPicker, setShowColorPicker } = useAppContext();

    // --- Core UI State ---
    const [showLegend, setShowLegend] = useState(true);
    const [numClasses, setNumClasses] = useState(5);
    const [vectorLoading, setVectorLoading] = useState(false);
    const [contourLoading, setContourLoading] = useState(false);
    const [clickedFeatureInfo, setClickedFeatureInfo] = useState(null);

    const [layerColors, setLayerColors] = useState({
        canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722", dams: "#0ea5e9", recharge: "#22c55e"
    });
    const handleColorChange = useCallback((layer, color) => setLayerColors(prev => ({ ...prev, [layer]: color })), []);

    // --- Legend Logic ---
    useEffect(() => { if (initialShowLegend) setShowLegend(true); }, [initialShowLegend]);
    useEffect(() => { setClickedFeatureInfo(null); }, [filters?.type]);

    const legendFeature = filters?.legendFeature || 'Category';

    useEffect(() => {
        const type = filters?.type;
        let targetFeature = 'Category';

        if (type === 'Rainfall') targetFeature = 'avg_rainfall';
        else if (type === 'Ground Water Resource Estimation') targetFeature = 'Category';
        else if (type === 'Water Quality') targetFeature = 'status';

        if (targetFeature !== filters?.legendFeature) {
            updateFilters({ legendFeature: targetFeature });
        }
    }, [filters?.type, filters?.legendFeature, updateFilters]);
    const toggleLegend = useCallback(() => setShowLegend(prev => !prev), []);

    // Shared data is fetched once by AppContent so map rendering does not
    // duplicate network requests and GIS processing.
    const {
        districtRainfall, piezometerRecords, reprojectedGwreData,
        raingaugeStations, damMarkers, validatedBlockData,
        selectedBoundary, selectedDistrictData, wfsBoundary
    } = mapData;

    const blockGeoJsonRef = useRef(null);

    // Filter handling wrapper
    const onLocationClickWithInfo = useCallback((latlng, data) => {
        const payload = formatClickedFeatureInfo(data, filters?.type);
        setClickedFeatureInfo(payload);
        if (onLocationClick) onLocationClick(latlng, data);
    }, [filters?.type, onLocationClick]);

    // --- Map View Logic ---
    const {
        map: mapInstance, mapRef, setSelectedDam, isRainfallDataEmpty,
        handleMapReady: handleMapReadyInternal, handleResetView, handleZoomIn, handleZoomOut,
        handleFullscreen, onMapClick, handleLocationClick, setIgnoreNextClick
    } = useMapView({
        filters, onLocationClick: onLocationClickWithInfo, validatedBlockData,
        selectedBoundary, selectedDistrictData, wfsBoundary,
        rainfallPoints, searchCoordinates,
        districtRainfall, isLoading, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden
    });

    const handleMapReady = useCallback((m) => {
        handleMapReadyInternal(m);
        setMap(m);
    }, [handleMapReadyInternal, setMap]);

    useMapResize(mapInstance, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden);
    const { handleExport, isExporting } = useMapExport(mapInstance, filters, exportTrigger);

    const featureOptions = useFeatureOptions(filters?.type);
    const legendData = useLegendData(filters, legendFeature, numClasses, validatedBlockData, reprojectedGwreData, rainfallPoints, waterQualityRecords, aquiferRecords, districtRainfall);

    useEffect(() => { if (filters?.type) handleResetView(); }, [filters?.type]);

    useEffect(() => {
        if (!filters?.district && !filters?.block) handleResetView();
    }, [filters?.district, filters?.block, handleResetView]);

    const { viewMode } = useAppContext();
    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => {
                if (mapRef.current) { try { mapRef.current.invalidateSize(); } catch (e) { } }
            }, 250);
        }
    }, [viewMode, mapRef]);

    const handleAquiferFeatureClick = useCallback((e) => {
        setIgnoreNextClick();
        const features = filters?.type === 'Well Inventory' ? [] : [{ ...e.layer.properties, type: 'aquifer_feature' }];
        handleLocationClick(e.latlng, features);
    }, [filters?.type, handleLocationClick, setIgnoreNextClick]);

    return (
        <div className="map-container professional-border">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <MapUpdater center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} basemap={basemap} onMapReady={handleMapReady} />
                <MapEvents onLocationClick={onMapClick} />
                <BasemapRenderer basemap={basemap} />

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
                    memoizedAquiferStyle={(props) => ({
                        fillColor: getAquiferColor(props.Aquifer || props.aquifer || ''),
                        fillOpacity: 0.7, stroke: true, color: '#94a3b8', weight: 0.3, opacity: 1, fill: true
                    })}
                    handleVectorLoading={setVectorLoading}
                    handleAquiferFeatureClick={handleAquiferFeatureClick}
                    microData={microData}
                    currentLevel={currentLevel}
                />
            </MapContainer>

            <MapWarning
                layerType={filters?.type}
                isRainfallDataEmpty={isRainfallDataEmpty}
                isLoading={isLoading}
            />

            <MapControls onResetView={handleResetView} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFullscreen={handleFullscreen} onToggleColorPicker={() => setShowColorPicker(!showColorPicker)} showColorPickerBtn={filters?.type === 'Water Resources'} onExport={handleExport} />
            <ColorPickerWidget isActive={showColorPicker && filters?.type === 'Water Resources'} layerColors={layerColors} onColorChange={handleColorChange} onClose={() => setShowColorPicker(false)} />

            <LegendToggle isActive={filters?.type} showLegend={showLegend} hasData={legendData.length > 0} onToggle={toggleLegend} />
            <LegendWidget isActive={filters?.type} showLegend={showLegend} legendData={legendData} legendFeature={legendFeature} numClasses={numClasses} featureOptions={featureOptions} onFeatureChange={(feat) => updateFilters({ legendFeature: feat })} onClassesChange={setNumClasses} onHide={toggleLegend} clickedFeatureInfo={clickedFeatureInfo} onDismissInfo={() => setClickedFeatureInfo(null)} />

            <ExportLoadingOverlay isActive={isExporting} />
        </div>
    );
});

export default MapView;
