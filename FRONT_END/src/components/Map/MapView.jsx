import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

/**
 * MapView Component
 * 
 * Main geospatial visualization component for the RSGWA GIS Analysis platform.
 * Professionally organized with custom hooks and layer components.
 */

// --- Styles & Constants ---
import './MapView.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, AQUIFER_COLORS, getAquiferColor } from '../../constants/mapConstants';
import { BACKEND_API, getBackendHeaders } from '../../api/config';

// --- Data ---
import { RAJASTHAN_DAMS_DATA } from '../../data/damsData';

// --- Custom Hooks ---
import {
    useDistrictRainfall,
    useWaterQuality,
    useAquiferData,
    usePiezometerData,
    useGeoJSONData,
    useRainfallStatsByBlock,
    useAggregatedRainfallPoints,
    useDamMarkers,
    useValidatedRajasthanData,
    useSelectedDistrictData,
    useFilteredBlockData,
    useValidatedBlockData,
    useValidatedBoundaries,
    useLegendData,
    useFeatureOptions,
    useMapView
} from '../../hooks';

// --- Components ---
import { MapEvents, MapUpdater } from './MapEvents';
import {
    StateBoundaryLayer,
    DistrictHighlightLayer,
    SelectionHighlightLayer,
    BlockBoundaryLayer,
    DrillDownBoundariesLayer,
    RainfallMarkersLayer,
    RaingaugeStationsLayer,
    WaterQualityMarkersLayer,
    AquiferMarkersLayer,
    PiezometerMarkersLayer,
    DamMarkersLayer,
    AquiferVectorLayer,
    WaterResourcesLayers,
    WaterQualityContourLayer
} from './layers';
import {
    MapControls, LegendToggle, LegendWidget, MapWarning, ColorPickerWidget, ExportLoadingOverlay
} from './MapOverlays';

// --- Context ---
import { useAppContext } from '../../context/AppContext';

// --- Utilities ---
import { reprojectGeoJSON } from '../../utils/reproject';

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapView = ({
    onLocationClick,
    blockBoundaryData,
    rajasthanData,
    dynamicBoundaries,
    selectedBoundary,
    selectedLevel,
    currentLevel,
    rainfallPoints = [],
    rainfallDataSource = 'station',
    rainfallStations = [],
    rainfallStationRecords = [],
    initialShowLegend,
    onAddToTable,
    onFiltersApply,
    microData,
    selectedWellInventory = [],
    onToggleWellInventory,
    isDataAnalysisSidebarHidden,
    isLoading,
    searchCoordinates,
    exportTrigger,
    canalData,
    waterbodyData
}) => {
    const {
        filters,
        basemap,
        isControlsSidebarCollapsed,
        setClickedLocation
    } = useAppContext();

    // --- State ---
    const [showLegend, setShowLegend] = useState(false);
    const [legendFeature, setLegendFeature] = useState('GWDL');
    const [numClasses, setNumClasses] = useState(5);

    // Color Picker State
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [vectorLoading, setVectorLoading] = useState(false);
    const [contourLoading, setContourLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [layerColors, setLayerColors] = useState({
        canals: "#00bcd4",
        waterbodies: "#0288d1",
        micro: "#ff5722",
        dams: "#0ea5e9"
    });

    const handleColorChange = (layer, color) => {
        setLayerColors(prev => ({
            ...prev,
            [layer]: color
        }));
    };


    // --- Data Fetching Hooks ---
    const { data: districtRainfall, loading: districtRainfallLoading } = useDistrictRainfall(filters?.type === 'Rainfall', filters);
    const { data: waterQualityRecords, loading: waterQualityLoading } = useWaterQuality(filters?.type === 'Water Quality', filters);
    const { data: aquiferRecords, loading: aquiferLoading } = useAquiferData(
        filters?.type === 'Well Inventory' || filters?.type === 'Aquifer',
        filters
    );
    const { data: piezometerRecords, loading: piezometersLoading } = usePiezometerData(filters?.type === 'Rainfall' && filters?.showPiezometers, filters);

    const { data: gwreData, loading: gwreLoading } = useGeoJSONData('/groundwater_zone.json', filters?.type === 'Ground Water Resource Estimation');
    const { data: raingaugeStations, loading: raingaugeLoading } = useGeoJSONData('/Raingauge Stations.geojson', filters?.type === 'Rainfall');
    const reprojectedGwreData = useMemo(() => gwreData ? reprojectGeoJSON(gwreData) : null, [gwreData]);

    // --- Data Processing Hooks ---
    const rainfallStatsByBlock = useRainfallStatsByBlock(rainfallPoints);
    const mapRainfallPoints = useAggregatedRainfallPoints(rainfallPoints, blockBoundaryData, filters?.type === 'Rainfall');

    // Transform station data for map display
    const stationRainfallPoints = useMemo(() => {
        if (!rainfallStations.length || !rainfallStationRecords.length) return [];

        // Group records by station
        const recordsByStation = rainfallStationRecords.reduce((acc, record) => {
            if (!acc[record.station]) acc[record.station] = [];
            acc[record.station].push(record);
            return acc;
        }, {});

        // Create points with aggregated data
        return rainfallStations.map(station => {
            const stationRecords = recordsByStation[station.id] || [];
            const totalRainfall = stationRecords.reduce((sum, r) => sum + (r.rainfall_mm || 0), 0);
            const latestRecord = stationRecords.length > 0
                ? stationRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                : null;

            return {
                id: `station-${station.id}`,
                station_id: station.id,
                station_name: station.name,
                station_district: station.district,
                latitude: station.latitude,
                longitude: station.longitude,
                rainfall_mm: latestRecord ? latestRecord.rainfall_mm : 0,
                date: latestRecord ? latestRecord.date : null,
                total_rainfall: totalRainfall,
                record_count: stationRecords.length,
                type: 'rainfall_station'
            };
        });
    }, [rainfallStations, rainfallStationRecords]);

    const damMarkers = useDamMarkers(filters?.type === 'Water Resources', RAJASTHAN_DAMS_DATA, blockBoundaryData, filters?.district);

    // --- GeoJSON Processing Hooks ---
    const validatedBoundaries = useValidatedBoundaries(dynamicBoundaries);
    const validatedRajasthanData = useValidatedRajasthanData(rajasthanData, filters, districtRainfall, legendFeature);
    const selectedDistrictData = useSelectedDistrictData(rajasthanData, filters?.district, validatedBoundaries, blockBoundaryData, isLoading);
    const filteredBlockData = useFilteredBlockData(blockBoundaryData, reprojectedGwreData, filters, rajasthanData, legendFeature);
    const validatedBlockData = useValidatedBlockData(filteredBlockData, filters, rainfallStatsByBlock, districtRainfall, legendFeature);

    // --- Main Map Interaction Hook ---
    const {
        map,
        mapRef,
        selectedDam,
        setSelectedDam,
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
    } = useMapView({
        filters,
        onLocationClick,
        validatedBlockData,
        selectedDistrictData,
        validatedBoundaries,
        selectedBoundary,
        rainfallPoints,
        searchCoordinates,
        districtRainfall,
        isLoading
    });

    // --- Export Logic ---
    const handleExport = async (type) => {
        if (!map) return;

        // 1. Determine BBox
        let bbox;
        if (type === 'current') {
            const bounds = map.getBounds();
            bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ];
        } else {
            // Full Rajasthan Extent (approx) or Dynamic based on state layer
            bbox = [69.3, 23.0, 78.3, 30.6];
        }

        // 2. Determine Selected Layers
        const selectedLayers = [];
        // Map frontend filters to backend layer names
        // Base layers often always enabled or context dependent
        if (filters?.type === 'Water Resources') {
            if (filters?.showCanals) selectedLayers.push('canals');
            if (filters?.showWaterbodies) selectedLayers.push('waterbodies');
            if (filters?.showMicro) selectedLayers.push('micro');
            if (filters?.showDams) selectedLayers.push('dams');
        } else if (filters?.type === 'Rainfall') {
            selectedLayers.push('rainfall');
        } else if (filters?.type === 'Well Inventory' || filters?.type === 'Aquifer') {
            // For well inventory or aquifer visualization
            selectedLayers.push('aquifer');
        } else if (filters?.type === 'Ground Water Resource Estimation') {
            selectedLayers.push('groundwater_zones');
        } else if (filters?.type === 'Water Quality') {
            selectedLayers.push('water_quality');
        } else {
            // Default/Fallbacks
            if (filters?.district) selectedLayers.push('district');
            else selectedLayers.push('state');
        }

        // Add boundaries context if needed
        if (filters?.district && !selectedLayers.includes('district')) selectedLayers.unshift('district');
        if (!filters?.district && !selectedLayers.includes('state')) {
            selectedLayers.unshift('state');
            // User requested district boundaries with state boundary
            if (!selectedLayers.includes('district')) selectedLayers.push('district');
        }


        const payload = {
            bbox,
            layers: selectedLayers,
            location_name: filters?.district || "Rajasthan_Map",
            format: "pdf",
            filters: {
                district: filters?.district,
                block: filters?.block,
                gramPanchayat: filters?.gramPanchayat,
                village: filters?.village,
                dataRangeStart: filters?.dataRangeStart,
                dataRangeEnd: filters?.dataRangeEnd,
                showEC: filters?.showEC,
                showNitrate: filters?.showNitrate,
                showFluoride: filters?.showFluoride,
                showTDS: filters?.showTDS
            }
        };

        try {
            setIsExporting(true);
            // Show loading indication (custom or rely on browser download UI)
            const response = await fetch(`${BACKEND_API.BASE_URL}/export/map/`, {
                method: "POST",
                headers: getBackendHeaders(true),
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Export failed");

            const result = await response.json();
            if (result.url) {
                // Open the generated PDF in a new tab
                window.open(result.url, '_blank');
            } else {
                throw new Error("No download URL received from server");
            }
        } catch (err) {
            console.error("Export failed:", err);
            alert("Map export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // Listen for external export trigger
    useEffect(() => {
        if (exportTrigger) {
            handleExport('state'); // Default to state wide or current based on requirement. 'state' gives a nice PDF usually.
        }
    }, [exportTrigger]);

    // --- Effects & Logic ---
    useEffect(() => { if (initialShowLegend) setShowLegend(true); }, [initialShowLegend]);
    useEffect(() => {
        const type = filters?.type;
        if (type === 'Rainfall') setLegendFeature('avg_rainfall');
        else if (type === 'Ground Water Resource Estimation') setLegendFeature('GWDL');
        else if (type === 'Water Quality') setLegendFeature('status');
        else setLegendFeature('GWDL');
    }, [filters?.type]);

    // Auto-reset view to Rajasthan on layer switch
    useEffect(() => {
        if (filters?.type) {
            handleResetView();
        }
    }, [filters?.type]);

    const toggleLegend = useCallback(() => setShowLegend(prev => !prev), []);

    const blockGeoJsonRef = useRef(null);
    const stateGeoJsonRef = useRef(null);
    const drillDownGeoJsonRef = useRef(null);

    // --- Legend Configuration ---
    const featureOptions = useFeatureOptions(filters?.type);
    const legendData = useLegendData(filters, legendFeature, numClasses, validatedBlockData, reprojectedGwreData, mapRainfallPoints, waterQualityRecords, aquiferRecords, districtRainfall);

    // --- Style & Filter Memos ---
    const aquiferFilter = useMemo(() => filters?.district ? { field: 'New_Dist', value: filters.district } : null, [filters?.district]);
    const canalFilter = useMemo(() => filters?.district ? { field: 'District', value: filters.district, block: filters.block, gp: filters.gramPanchayat } : null, [filters?.district, filters?.block, filters?.gramPanchayat]);
    const waterbodyFilter = useMemo(() => filters?.district ? { field: 'District', value: filters.district, block: filters.block, gp: filters.gramPanchayat } : null, [filters?.district, filters?.block, filters?.gramPanchayat]);

    const memoizedAquiferStyle = useMemo(() => (props) => {
        const type = props.Aquifer || props.aquifer || '';
        return {
            fillColor: getAquiferColor(type),
            fillOpacity: 0.7,
            stroke: true,
            color: '#94a3b8',
            weight: 0.3,
            opacity: 1,
            fill: true
        };
    }, []);

    // --- Map Resizing Effects ---
    useEffect(() => {
        if (!map) return;
        const observer = new ResizeObserver(() => {
            setTimeout(() => {
                try {
                    if (map && map._container && map._mapPane && typeof map.invalidateSize === 'function') {
                        map.invalidateSize(false);
                    }
                } catch (e) {
                    console.warn("Map resize observation failed", e);
                }
            }, 150);
        });

        try {
            if (map && typeof map.getContainer === 'function') {
                const container = map.getContainer();
                if (container) {
                    observer.observe(container);
                }
            }
        } catch (e) {
            console.warn("Map resize observation failed", e);
        }

        return () => observer.disconnect();
    }, [map]);

    // Explicitly invalidate size on sidebar state changes
    useEffect(() => {
        if (map && map.getContainer()) {
            setTimeout(() => {
                try {
                    if (map && map.getContainer() && map._mapPane && typeof map.invalidateSize === 'function') {
                        map.invalidateSize(false);
                    }
                } catch (e) {
                    console.warn("Map explicit resize failed", e);
                }
            }, 300); // Wait for CSS transitions to finish
        }
    }, [map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden]);

    // --- Basemap Renderer ---
    const renderBasemap = () => {
        const url = basemap === 'imagery-labels' || basemap === 'imagery'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : basemap === 'streets'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
        return (
            <>
                <TileLayer url={url} attribution='Tiles &copy; Esri' />
                {basemap === 'imagery-labels' && (
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" zIndex={10} />
                )}
            </>
        );
    };

    return (
        <div className="map-container professional-border">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <MapUpdater center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} basemap={basemap} onMapReady={handleMapReady} />
                <MapEvents onLocationClick={onMapClick} />
                {renderBasemap()}

                {/* --- Primary Administrative Layers --- */}
                {(!filters?.district || ['Rainfall', 'Water Quality', 'Ground Water Resource Estimation', 'Water Resources', 'Well Inventory', 'Aquifer'].includes(filters?.type)) && (
                    <StateBoundaryLayer
                        key={`state-layer-${filters?.type}-${filters?.district || 'all'}-${Object.keys(districtRainfall || {}).length}`}
                        data={validatedRajasthanData}
                        filters={filters}
                        legendFeature={legendFeature}
                        legendData={legendData}
                        districtRainfall={districtRainfall}
                        onFiltersApply={onFiltersApply}
                        onLocationClick={handleLocationClick}
                        geoJsonRef={stateGeoJsonRef}
                    />
                )}

                {/* --- Block Layer: Dynamic visibility based on thematic requirements --- */}
                {!filters?.gramPanchayat && (
                    filters?.block ||
                    filters?.type === 'Ground Water Resource Estimation' || // GWRE is block-based state-wide
                    (filters?.district && ['Rainfall', 'Water Quality'].includes(filters?.type)) // Others need a district focus
                ) && (
                        <BlockBoundaryLayer
                            key={`block-layer-${filters?.type}-${filters?.district}-${filters?.block}-${filters?.gramPanchayat}-${rainfallPoints?.length}`}
                            data={validatedBlockData}
                            filters={filters}
                            legendFeature={legendFeature}
                            legendData={legendData}
                            geoJsonRef={blockGeoJsonRef}
                            onLocationClick={handleLocationClick}
                        />
                    )}

                <DamMarkersLayer isActive={filters?.showDams} damMarkers={damMarkers} onDamClick={setSelectedDam} onAddToTable={onAddToTable} color={layerColors.dams} />
                <RainfallMarkersLayer
                    isActive={filters?.type === 'Rainfall'}
                    showVillageLevel={true}
                    rainfallPoints={mapRainfallPoints}
                    stationPoints={stationRainfallPoints}
                    dataSource={rainfallDataSource}
                    onAddToTable={onAddToTable}
                />
                <RaingaugeStationsLayer isActive={filters?.type === 'Rainfall'} showStations={filters?.showRaingaugeStations} data={raingaugeStations} district={filters?.district} />
                <PiezometerMarkersLayer isActive={filters?.type === 'Rainfall' && filters?.showPiezometers} records={piezometerRecords} onLocationClick={handleLocationClick} />
                <WaterQualityMarkersLayer isActive={filters?.type === 'Water Quality'} records={waterQualityRecords} onLocationClick={handleLocationClick} />
                <WaterQualityContourLayer
                    isActive={filters?.type === 'Water Quality' && filters?.showEC}
                    parameter="ec"
                    filters={filters}
                    label="EC"
                    onLoading={setContourLoading}
                />
                <WaterQualityContourLayer
                    isActive={filters?.type === 'Water Quality' && filters?.showNitrate}
                    parameter="nitrate"
                    filters={filters}
                    label="Nitrate"
                    onLoading={setContourLoading}
                />
                <WaterQualityContourLayer
                    isActive={filters?.type === 'Water Quality' && filters?.showFluoride}
                    parameter="fluoride"
                    filters={filters}
                    label="Fluoride"
                    onLoading={setContourLoading}
                />
                <WaterQualityContourLayer
                    isActive={filters?.type === 'Water Quality' && filters?.showTDS}
                    parameter="tds"
                    filters={filters}
                    label="TDS"
                    onLoading={setContourLoading}
                />
                <AquiferMarkersLayer isActive={filters?.type === 'Well Inventory'} records={aquiferRecords} onLocationClick={handleLocationClick} />

                {filters?.type === 'Well Inventory' && selectedWellInventory.length > 0 && (
                    <>
                        {selectedWellInventory.map((item, idx) => (
                            <CircleMarker
                                key={`selected-${item.well_id || item.id || idx}`}
                                center={[item.latitude || item.lat, item.longitude || item.lng]}
                                radius={8}
                                pathOptions={{
                                    fillColor: '#ef4444',
                                    color: 'white',
                                    weight: 2,
                                    opacity: 1,
                                    fillOpacity: 1
                                }}
                            />
                        ))}
                    </>
                )}

                <AquiferVectorLayer
                    isActive={filters?.type === 'Aquifer' || filters?.type === 'Well Inventory'}
                    district={filters?.district}
                    filter={aquiferFilter}
                    style={memoizedAquiferStyle}
                    onLoading={setVectorLoading}
                    onFeatureClick={(e) => {
                        setIgnoreNextClick();
                        if (filters?.type === 'Well Inventory') {
                            handleLocationClick(e.latlng, []);
                        } else {
                            handleLocationClick(e.latlng, [{ ...e.layer.properties, type: 'aquifer_feature' }]);
                        }
                    }}
                />
                <WaterResourcesLayers
                    isActive={filters?.type === 'Water Resources'}
                    showCanals={filters?.showCanals}
                    showWaterbodies={filters?.showWaterbodies}
                    showMicro={filters?.showMicro}
                    canalData={canalData}
                    waterbodyData={waterbodyData}
                    canalFilter={canalFilter}
                    waterbodyFilter={waterbodyFilter}
                    microData={microData}
                    layerColors={layerColors}
                    onLoading={setVectorLoading}
                />

                {/* 1. Only show drill-down children for sub-block levels (GP and Village) */}
                {/* This avoids overlapping with District and Block layers at higher levels */}
                {!(filters?.type === 'Rainfall' || filters?.type === 'Ground Water Resource Estimation' || filters?.type === 'Water Quality') && filters?.block && !filters?.village && (
                    <DrillDownBoundariesLayer
                        data={validatedBoundaries}
                        filters={filters}
                        currentLevel={currentLevel}
                        onFiltersApply={onFiltersApply}
                        onLocationClick={handleLocationClick}
                        geoJsonRef={drillDownGeoJsonRef}
                    />
                )}

                {/* 2. Selection highlight (replaces both district and child highlights) */}
                <SelectionHighlightLayer
                    key={`selection-highlight-${filters?.district}-${filters?.block}-${filters?.gramPanchayat}-${filters?.village}-${selectedLevel}`}
                    data={selectedBoundary}
                    level={selectedLevel || currentLevel}
                />
            </MapContainer>

            <MapWarning
                layerType={filters?.type}
                isRainfallDataEmpty={isRainfallDataEmpty}
                isLoading={isLoading || vectorLoading || contourLoading || districtRainfallLoading || piezometersLoading || waterQualityLoading || aquiferLoading || gwreLoading || raingaugeLoading}
            />
            <MapControls
                onResetView={handleResetView}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFullscreen={handleFullscreen}
                onToggleColorPicker={() => setShowColorPicker(!showColorPicker)}
                showColorPickerBtn={filters?.type === 'Water Resources'}
                onExport={handleExport}
            />
            <ColorPickerWidget
                isActive={showColorPicker && filters?.type === 'Water Resources'}
                layerColors={layerColors}
                onColorChange={handleColorChange}
                onClose={() => setShowColorPicker(false)}
            />

            <LegendToggle isActive={filters?.type} showLegend={showLegend} hasData={legendData.length > 0} onToggle={toggleLegend} />
            <LegendWidget isActive={filters?.type} showLegend={showLegend} legendData={legendData} legendFeature={legendFeature} numClasses={numClasses} featureOptions={featureOptions} onFeatureChange={setLegendFeature} onClassesChange={setNumClasses} onHide={toggleLegend} />

            <ExportLoadingOverlay isActive={isExporting} />
        </div>
    );
};

export default MapView;
