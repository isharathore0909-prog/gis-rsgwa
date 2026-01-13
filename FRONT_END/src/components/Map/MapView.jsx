import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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

// --- Data ---
import { RAJASTHAN_DAMS_DATA } from '../../data/damsData';

// --- Custom Hooks ---
import {
    useDistrictRainfall,
    useWaterQuality,
    useAquiferData,
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
    BlockBoundaryLayer,
    DrillDownBoundariesLayer,
    RainfallMarkersLayer,
    RaingaugeStationsLayer,
    WaterQualityMarkersLayer,
    AquiferMarkersLayer,
    DamMarkersLayer,
    AquiferVectorLayer,
    WaterResourcesLayers
} from './layers';
import { MapControls, LegendToggle, LegendWidget, MapWarning } from './MapOverlays';

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
    basemap,
    onLocationClick,
    filters,
    blockBoundaryData,
    rajasthanData,
    dynamicBoundaries,
    currentLevel,
    rainfallPoints = [],
    initialShowLegend,
    onAddToTable,
    onFiltersApply,
    microData,
    selectedWellInventory = [],
    onToggleWellInventory,
    isControlsSidebarCollapsed,
    isDataAnalysisSidebarHidden
}) => {
    // --- State ---
    const [showLegend, setShowLegend] = useState(false);
    const [legendFeature, setLegendFeature] = useState('GWDL');
    const [numClasses, setNumClasses] = useState(5);

    // --- Data Fetching Hooks ---
    const districtRainfall = useDistrictRainfall(filters?.type === 'Rainfall');
    const waterQualityRecords = useWaterQuality(filters?.type === 'Water Quality', filters);
    const aquiferRecords = useAquiferData(
        filters?.type === 'Well Inventory' || filters?.type === 'Aquifer',
        filters
    );

    const gwreData = useGeoJSONData('/groundwater_zone.json', filters?.type === 'Ground Water Resource Estimation');
    const raingaugeStations = useGeoJSONData('/Raingauge Stations.geojson', filters?.type === 'Rainfall');
    const reprojectedGwreData = useMemo(() => gwreData ? reprojectGeoJSON(gwreData) : null, [gwreData]);

    // --- Data Processing Hooks ---
    const rainfallStatsByBlock = useRainfallStatsByBlock(rainfallPoints);
    const mapRainfallPoints = useAggregatedRainfallPoints(rainfallPoints, blockBoundaryData, filters?.type === 'Rainfall');
    const damMarkers = useDamMarkers(filters?.type === 'Water Resources', RAJASTHAN_DAMS_DATA, blockBoundaryData, filters?.district);

    // --- GeoJSON Processing Hooks ---
    const validatedRajasthanData = useValidatedRajasthanData(rajasthanData, filters, districtRainfall, legendFeature);
    const selectedDistrictData = useSelectedDistrictData(rajasthanData, filters?.district);
    const filteredBlockData = useFilteredBlockData(blockBoundaryData, reprojectedGwreData, filters, rajasthanData, legendFeature);
    const validatedBlockData = useValidatedBlockData(filteredBlockData, filters, rainfallStatsByBlock, legendFeature);
    const validatedBoundaries = useValidatedBoundaries(dynamicBoundaries);

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
        rainfallPoints
    });

    // --- Effects & Logic ---
    useEffect(() => { if (initialShowLegend) setShowLegend(true); }, [initialShowLegend]);
    useEffect(() => {
        const type = filters?.type;
        if (type === 'Rainfall') setLegendFeature('avg_rainfall');
        else if (type === 'Ground Water Resource Estimation') setLegendFeature('GWDL');
        else if (type === 'Water Quality') setLegendFeature('status');
        else setLegendFeature('GWDL');
    }, [filters?.type]);

    const toggleLegend = useCallback(() => setShowLegend(prev => !prev), []);

    const blockGeoJsonRef = useRef(null);
    const stateGeoJsonRef = useRef(null);
    const drillDownGeoJsonRef = useRef(null);

    // --- Legend Configuration ---
    const featureOptions = useFeatureOptions(filters?.type);
    const legendData = useLegendData(filters, legendFeature, numClasses, blockBoundaryData, reprojectedGwreData, mapRainfallPoints, waterQualityRecords, aquiferRecords, districtRainfall);

    // --- Style & Filter Memos ---
    const aquiferFilter = useMemo(() => filters?.district ? { field: 'New_Dist', value: filters.district } : null, [filters?.district]);
    const canalFilter = useMemo(() => filters?.district ? { field: 'District', value: filters.district } : null, [filters?.district]);
    const waterbodyFilter = useMemo(() => filters?.district ? { field: 'District', value: filters.district } : null, [filters?.district]);

    const memoizedAquiferStyle = useMemo(() => (props) => {
        const type = props.Aquifer || props.aquifer || '';
        return {
            fillColor: getAquiferColor(type),
            fillOpacity: 0.7,
            stroke: true,
            color: '#444444',
            weight: 0.5,
            opacity: 1,
            fill: true
        };
    }, []);

    // --- Map Resizing Effects ---
    useEffect(() => {
        if (!map) return;
        const observer = new ResizeObserver(() => {
            setTimeout(() => map.invalidateSize(), 150);
        });
        const container = map.getContainer();
        observer.observe(container);
        return () => observer.disconnect();
    }, [map]);

    // Explicitly invalidate size on sidebar state changes
    useEffect(() => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
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
        <div className="map-container">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <MapUpdater center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} basemap={basemap} onMapReady={handleMapReady} />
                <MapEvents onLocationClick={onMapClick} />
                {renderBasemap()}

                <StateBoundaryLayer data={validatedRajasthanData} filters={filters} legendFeature={legendFeature} legendData={legendData} districtRainfall={districtRainfall} onFiltersApply={onFiltersApply} geoJsonRef={stateGeoJsonRef} />
                <DistrictHighlightLayer data={selectedDistrictData} district={filters?.district} />
                <DrillDownBoundariesLayer data={validatedBoundaries} filters={filters} currentLevel={currentLevel} onFiltersApply={onFiltersApply} geoJsonRef={drillDownGeoJsonRef} />
                {showBlockBoundary && <BlockBoundaryLayer data={validatedBlockData} filters={filters} legendFeature={legendFeature} legendData={legendData} geoJsonRef={blockGeoJsonRef} onLocationClick={handleLocationClick} />}

                <DamMarkersLayer isActive={filters?.showDams} damMarkers={damMarkers} onDamClick={setSelectedDam} onAddToTable={onAddToTable} />
                <RainfallMarkersLayer isActive={filters?.type === 'Rainfall'} showVillageLevel={!!filters?.village} rainfallPoints={mapRainfallPoints} onAddToTable={onAddToTable} />
                <RaingaugeStationsLayer isActive={filters?.type === 'Rainfall'} showStations={filters?.showRaingaugeStations} data={raingaugeStations} district={filters?.district} />
                <WaterQualityMarkersLayer isActive={filters?.type === 'Water Quality'} records={waterQualityRecords} onLocationClick={handleLocationClick} />
                <AquiferMarkersLayer isActive={filters?.type === 'Well Inventory'} records={aquiferRecords} onLocationClick={handleLocationClick} />

                {filters?.type === 'Well Inventory' && selectedWellInventory.length > 0 && (
                    <>
                        {selectedWellInventory.map((item, idx) => (
                            <Marker
                                key={`selected-${item.well_id || item.id || idx}`}
                                position={[item.latitude || item.lat, item.longitude || item.lng]}
                            />
                        ))}
                    </>
                )}

                <AquiferVectorLayer
                    isActive={filters?.type === 'Aquifer' || filters?.type === 'Well Inventory'}
                    filter={aquiferFilter}
                    style={memoizedAquiferStyle}
                    onFeatureClick={(e) => {
                        setIgnoreNextClick();
                        handleLocationClick(e.latlng, [{ ...e.layer.properties, type: 'aquifer_feature' }]);
                    }}
                />
                <WaterResourcesLayers isActive={filters?.type === 'Water Resources'} showCanals={filters?.showCanals} showWaterbodies={filters?.showWaterbodies} showMicro={filters?.showMicro} canalFilter={canalFilter} waterbodyFilter={waterbodyFilter} microData={microData} />
            </MapContainer>

            <MapWarning
                layerType={filters?.type}
                isRainfallDataEmpty={isRainfallDataEmpty}
            />
            <MapControls onResetView={handleResetView} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFullscreen={handleFullscreen} />
            <LegendToggle isActive={filters?.type} showLegend={showLegend} hasData={legendData.length > 0} onToggle={toggleLegend} />
            <LegendWidget isActive={filters?.type} showLegend={showLegend} legendData={legendData} legendFeature={legendFeature} numClasses={numClasses} featureOptions={featureOptions} onFeatureChange={setLegendFeature} onClassesChange={setNumClasses} onHide={toggleLegend} />
        </div>
    );
};

export default MapView;
