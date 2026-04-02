import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
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
import {
    StateBoundaryLayer, DistrictHighlightLayer, SelectionHighlightLayer,
    BlockBoundaryLayer, DrillDownBoundariesLayer, RaingaugeStationsLayer,
    WaterQualityMarkersLayer, AquiferMarkersLayer, PiezometerMarkersLayer,
    DamMarkersLayer, AquiferVectorLayer, WaterResourcesLayers, WaterQualityContourLayer
} from './layers';
import {
    MapControls, LegendToggle, LegendWidget, MapWarning, ColorPickerWidget, ExportLoadingOverlay
} from './Overlays';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapView = ({
    onLocationClick, blockBoundaryData, rajasthanData, dynamicBoundaries,
    selectedBoundary, selectedLevel, currentLevel, hierarchy,
    rainfallPoints = [], rainfallDataSource = 'station', rainfallStations = [],
    rainfallStationRecords = [], initialShowLegend, onAddToTable, onFiltersApply,
    microData, selectedWellInventory = [], onToggleWellInventory,
    isDataAnalysisSidebarHidden, isLoading, searchCoordinates, exportTrigger,
    canalData, waterbodyData, aquiferPolygons
}) => {
    const { filters, basemap, isControlsSidebarCollapsed, setClickedLocation } = useAppContext();

    // --- Core UI State ---
    const [showLegend, setShowLegend] = useState(false);
    const [legendFeature, setLegendFeature] = useState('GWDL');
    const [numClasses, setNumClasses] = useState(5);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [vectorLoading, setVectorLoading] = useState(false);
    const [contourLoading, setContourLoading] = useState(false);

    const [layerColors, setLayerColors] = useState({
        canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722", dams: "#0ea5e9"
    });
    const handleColorChange = useCallback((layer, color) => setLayerColors(prev => ({ ...prev, [layer]: color })), []);

    // --- Legend Logic ---
    useEffect(() => { if (initialShowLegend) setShowLegend(true); }, [initialShowLegend]);
    useEffect(() => {
        const type = filters?.type;
        if (type === 'Rainfall') setLegendFeature('avg_rainfall');
        else if (type === 'Ground Water Resource Estimation') setLegendFeature('GWDL');
        else if (type === 'Water Quality') setLegendFeature('status');
        else setLegendFeature('GWDL');
    }, [filters?.type]);
    const toggleLegend = useCallback(() => setShowLegend(prev => !prev), []);

    // --- Stability Tracking ---
    const prevTypeRef = useRef(filters?.type);
    const [isLayerChanging, setIsLayerChanging] = useState(false);
    const layerChangeTimeoutRef = useRef(null);

    useEffect(() => {
        if (filters?.type !== prevTypeRef.current) {
            setIsLayerChanging(true);
            prevTypeRef.current = filters?.type;

            // Safety timeout: Clear the 'changing' overlay after 6 seconds regardless of isLoading
            // This prevents a stuck overlay if any of the complex hooks fail to clear their loading flags
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
        waterQualityRecords, waterQualityLoading,
        aquiferRecords, aquiferLoading,
        piezometerRecords, piezometersLoading,
        reprojectedGwreData, gwreLoading,
        raingaugeStations, raingaugeLoading,
        aggregatedRainfallPoints, stationRainfallPoints,
        damMarkers,
        validatedBoundaries, validatedRajasthanData,
        selectedDistrictData, validatedBlockData
    } = useMapDataFetch({
        filters, rainfallPoints, blockBoundaryData, rajasthanData,
        dynamicBoundaries, rainfallStations, rainfallStationRecords,
        legendFeature, isLoading
    });

    // --- GeoJSON Refs ---
    const blockGeoJsonRef = useRef(null);
    const stateGeoJsonRef = useRef(null);
    const drillDownGeoJsonRef = useRef(null);

    // --- Map View Logic ---
    const {
        map, mapRef, selectedDam, setSelectedDam, isRainfallDataEmpty,
        handleMapReady, handleResetView, handleZoomIn, handleZoomOut,
        handleFullscreen, onMapClick, handleLocationClick, setIgnoreNextClick
    } = useMapView({
        filters, onLocationClick, validatedBlockData, selectedDistrictData,
        validatedBoundaries, selectedBoundary, rainfallPoints, searchCoordinates,
        districtRainfall, isLoading, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden
    });

    // --- Feature Hooks ---
    useMapResize(map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden);
    const { handleExport, isExporting } = useMapExport(map, filters, exportTrigger);

    const featureOptions = useFeatureOptions(filters?.type);
    const legendData = useLegendData(filters, legendFeature, numClasses, validatedBlockData, reprojectedGwreData, aggregatedRainfallPoints, waterQualityRecords, aquiferRecords, districtRainfall);

    // Auto-reset view to Rajasthan on layer switch
    useEffect(() => { if (filters?.type) handleResetView(); }, [filters?.type]);

    // --- Style & Filter Memos ---
    const aquiferFilter = useMemo(() => filters?.district ? {
        field: 'New_Dist',
        value: filters.district,
        block: filters.block
    } : null, [filters?.district, filters.block]);
    const canalFilter = useMemo(() => filters?.district ? { field: 'District', value: filters.district, block: filters.block, gp: filters.gramPanchayat, boundary: selectedBoundary } : null, [filters?.district, filters?.block, filters?.gramPanchayat, selectedBoundary]);
    const waterbodyFilter = useMemo(() => filters?.district ? { field: 'District', value: filters.district, block: filters.block, gp: filters.gramPanchayat, boundary: selectedBoundary } : null, [filters?.district, filters?.block, filters?.gramPanchayat, selectedBoundary]);

    const memoizedAquiferStyle = useMemo(() => (props) => ({
        fillColor: getAquiferColor(props.Aquifer || props.aquifer || ''),
        fillOpacity: 0.7, stroke: true, color: '#94a3b8', weight: 0.3, opacity: 1, fill: true
    }), []);

    // --- Rendering ---
    const renderBasemap = () => {
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
    };

    return (
        <div className="map-container professional-border">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <MapUpdater center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} basemap={basemap} onMapReady={handleMapReady} />
                <MapEvents onLocationClick={onMapClick} />
                {renderBasemap()}

                {/* State-Level District Choropleth - Keep visible for Rainfall mode even during drill-down */}
                {(!filters?.district || filters?.type === 'Rainfall') && (
                    <StateBoundaryLayer key={`state-${filters?.type}-${filters?.district}-${Object.keys(districtRainfall || {}).length}`} data={validatedRajasthanData} filters={filters} legendFeature={legendFeature} legendData={legendData} districtRainfall={districtRainfall} onFiltersApply={onFiltersApply} onLocationClick={handleLocationClick} geoJsonRef={stateGeoJsonRef} />
                )}

                {/* Show block choropleth for GWRE at state level, OR for all layers when drilling into a district. 
                    Keep it visible for thematic layers (Rainfall/GWRE) even when a block is selected so the color persists. */}
                {((filters?.district && (filters?.block || filters?.type === 'Ground Water Resource Estimation') && !filters?.gramPanchayat) || (filters?.type === 'Ground Water Resource Estimation' && !filters?.district)) && (
                    <BlockBoundaryLayer key={`block-${filters?.type}-${filters?.district}-${filters?.block}`} data={validatedBlockData} filters={filters} legendFeature={legendFeature} legendData={legendData} geoJsonRef={blockGeoJsonRef} onLocationClick={handleLocationClick} />
                )}

                <DamMarkersLayer isActive={filters?.showDams} damMarkers={damMarkers} onDamClick={setSelectedDam} onAddToTable={onAddToTable} color={layerColors.dams} />
                <RaingaugeStationsLayer isActive={filters?.type === 'Rainfall'} showStations={filters?.showRaingaugeStations} data={raingaugeStations} district={filters?.district} />
                <PiezometerMarkersLayer isActive={filters?.type === 'Rainfall' && filters?.showPiezometers} records={piezometerRecords} onLocationClick={handleLocationClick} />
                <WaterQualityMarkersLayer isActive={filters?.type === 'Water Quality' && filters?.showMarkers} records={waterQualityRecords} onLocationClick={handleLocationClick} />

                <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showEC} parameter="ec" filters={filters} label="EC" onLoading={setContourLoading} />
                <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showNitrate} parameter="nitrate" filters={filters} label="Nitrate" onLoading={setContourLoading} />
                <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showFluoride} parameter="fluoride" filters={filters} label="Fluoride" onLoading={setContourLoading} />
                <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showTDS} parameter="tds" filters={filters} label="TDS" onLoading={setContourLoading} />

                <AquiferMarkersLayer isActive={filters?.type === 'Well Inventory'} records={aquiferRecords} onLocationClick={handleLocationClick} />

                {filters?.type === 'Well Inventory' && selectedWellInventory.length > 0 && selectedWellInventory.map((item, idx) => (
                    <CircleMarker key={`sel-${item.well_id || idx}`} center={[item.latitude || item.lat, item.longitude || item.lng]} radius={8} pathOptions={{ fillColor: '#ef4444', color: 'white', weight: 2, opacity: 1, fillOpacity: 1 }} />
                ))}

                <AquiferVectorLayer isActive={filters?.type === 'Aquifer' || filters?.type === 'Well Inventory'} district={filters?.district} filter={aquiferFilter} data={aquiferPolygons} style={memoizedAquiferStyle} onLoading={setVectorLoading} onFeatureClick={(e) => { setIgnoreNextClick(); handleLocationClick(e.latlng, filters?.type === 'Well Inventory' ? [] : [{ ...e.layer.properties, type: 'aquifer_feature' }]); }} />

                <WaterResourcesLayers isActive={filters?.type === 'Water Resources'} showCanals={filters?.showCanals} showWaterbodies={filters?.showWaterbodies} showMicro={filters?.showMicro} canalData={canalData} waterbodyData={waterbodyData} canalFilter={canalFilter} waterbodyFilter={waterbodyFilter} microData={microData} layerColors={layerColors} onLoading={setVectorLoading} />



                {/* Hierarchical Selection Highlights (Shared Pane) */}
                <Pane name="selectionHighlightPane" style={{ zIndex: 650 }}>
                    {filters?.village ? (
                        <SelectionHighlightLayer key={`sel-high-village-${filters?.village}`} data={hierarchy.village} level="village" />
                    ) : filters?.gramPanchayat ? (
                        <SelectionHighlightLayer key={`sel-high-gp-${filters?.gramPanchayat}`} data={hierarchy.gp} level="gp" />
                    ) : filters?.block ? (
                        // For thematic layers at block level, BlockBoundaryLayer already handles the fill/outline
                        !['Rainfall', 'Ground Water Resource Estimation'].includes(filters?.type) && (
                            <SelectionHighlightLayer key={`sel-high-block-${filters?.block}`} data={hierarchy.block} level="block" />
                        )
                    ) : filters?.district ? (
                        <SelectionHighlightLayer key={`sel-high-dist-${filters?.district}`} data={hierarchy.district} level="district" />
                    ) : null}


                    {/* Selection Highlights (Dynamic Fallback) */}
                    {!hierarchy?.village && !hierarchy?.gp && !hierarchy?.block && !hierarchy?.district && selectedBoundary && (
                        <SelectionHighlightLayer
                            key={`sel-high-fallback-${selectedLevel}`}
                            data={selectedBoundary}
                            level={selectedLevel || currentLevel}
                        />
                    )}
                </Pane>
            </MapContainer>

            {/* Only show the full-screen warning for major layer changes or initial load. Filter updates are silent. */}
            <MapWarning
                layerType={filters?.type}
                isRainfallDataEmpty={isRainfallDataEmpty}
                isLoading={(isLayerChanging && isLoading) || (!rajasthanData && isLoading)}
            />

            <MapControls onResetView={handleResetView} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFullscreen={handleFullscreen} onToggleColorPicker={() => setShowColorPicker(!showColorPicker)} showColorPickerBtn={filters?.type === 'Water Resources'} onExport={handleExport} />
            <ColorPickerWidget isActive={showColorPicker && filters?.type === 'Water Resources'} layerColors={layerColors} onColorChange={handleColorChange} onClose={() => setShowColorPicker(false)} />

            <LegendToggle isActive={filters?.type} showLegend={showLegend} hasData={legendData.length > 0} onToggle={toggleLegend} />
            <LegendWidget isActive={filters?.type} showLegend={showLegend} legendData={legendData} legendFeature={legendFeature} numClasses={numClasses} featureOptions={featureOptions} onFeatureChange={setLegendFeature} onClassesChange={setNumClasses} onHide={toggleLegend} />

            <ExportLoadingOverlay isActive={isExporting} />
        </div>
    );
};

export default MapView;
