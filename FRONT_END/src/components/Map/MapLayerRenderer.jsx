import React from 'react';
import { CircleMarker } from 'react-leaflet';
import {
    StateBoundaryLayer, WmsSelectionHighlight,
    BlockBoundaryLayer, DrillDownBoundariesLayer, RaingaugeStationsLayer,
    WaterQualityMarkersLayer, WaterLevelBubbleLayer, PiezometerMarkersLayer,
    DamMarkersLayer, AquiferVectorLayer, WaterResourcesLayers, WaterQualityContourLayer,
    RainfallDistrictChoroplethLayer, GroundwaterStatusLayer
} from './layers';

const MapLayerRenderer = ({
    filters,
    districtRainfall,
    legendFeature,
    legendData,
    onFiltersApply,
    handleLocationClick,
    validatedBlockData,
    blockGeoJsonRef,
    damMarkers,
    setSelectedDam,
    onAddToTable,
    layerColors,
    raingaugeStations,
    piezometerRecords,
    waterQualityRecords,
    setContourLoading,
    aquiferRecords,
    selectedWellInventory,
    memoizedAquiferStyle,
    handleVectorLoading,
    handleAquiferFeatureClick,
    canalFilter,
    waterbodyFilter,
    microData,
    rechargeRecords,
    showRecharge,
    currentLevel,
}) => {
    return (
        <>
            {/* State-Level District Outlines */}
            {(!filters?.district) && (
                <StateBoundaryLayer
                    key={`state-wms-bg-${filters?.type}`}
                    filters={filters}
                    legendFeature={legendFeature}
                    legendData={legendData}
                    districtRainfall={districtRainfall}
                    isBackground={true}
                />
            )}

            {/* Rainfall Choropleth (District/Block Level) */}
            {(filters?.type === 'Rainfall') && (
                <RainfallDistrictChoroplethLayer
                    isActive={true}
                    filters={filters}
                />
            )}

            {/* Block boundaries — shown whenever a district is selected */}
            {(filters?.district) && (
                <BlockBoundaryLayer
                    key={`block-wms-${filters?.type}-${filters?.district}`}
                    filters={filters}
                    legendFeature={legendFeature}
                    legendData={legendData}
                    blockData={validatedBlockData}
                />
            )}

            <DamMarkersLayer
                isActive={filters?.showDams}
                damMarkers={damMarkers}
                onDamClick={(dam) => handleLocationClick({ lat: dam.coordinate.lat, lng: dam.coordinate.lng }, [{ ...dam, type: 'dam' }])}
                onAddToTable={onAddToTable}
                color={layerColors.dams}
            />
            <RaingaugeStationsLayer
                isActive={filters?.type === 'Rainfall'}
                showStations={filters?.showRaingaugeStations}
                data={raingaugeStations}
                district={filters?.district}
            />
            <PiezometerMarkersLayer
                isActive={filters?.type === 'Rainfall' && filters?.showPiezometers}
                records={piezometerRecords}
                onLocationClick={handleLocationClick}
            />

            <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showEC} parameter="ec" filters={filters} label="EC" onLoading={setContourLoading} />
            <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showNitrate} parameter="nitrate" filters={filters} label="Nitrate" onLoading={setContourLoading} />
            <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showFluoride} parameter="fluoride" filters={filters} label="Fluoride" onLoading={setContourLoading} />
            <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showTDS} parameter="tds" filters={filters} label="TDS" onLoading={setContourLoading} />
            <WaterQualityContourLayer isActive={filters?.type === 'Water Quality' && filters?.showPH} parameter="ph" filters={filters} label="pH" onLoading={setContourLoading} />

            <WaterLevelBubbleLayer isActive={filters?.type === 'Well Inventory'} filters={filters} onLocationClick={handleLocationClick} />

            {filters?.type === 'Well Inventory' && selectedWellInventory.length > 0 && selectedWellInventory.map((item, idx) => (
                <CircleMarker
                    key={`sel-${item.well_id || idx}`}
                    center={[item.latitude || item.lat, item.longitude || item.lng]}
                    radius={8}
                    pathOptions={{ fillColor: '#ef4444', color: 'white', weight: 2, opacity: 1, fillOpacity: 1 }}
                />
            ))}

            <AquiferVectorLayer
                isActive={filters?.type === 'Aquifer'}
                filters={filters}
            />

            <GroundwaterStatusLayer
                isActive={
                    filters?.type === 'Ground Water Resource Estimation' ||
                    filters?.type === 'Ground water resource extraction' ||
                    filters?.type === 'Ground Water'
                }
                filters={filters}
            />

            <WaterResourcesLayers
                isActive={filters?.type === 'Water Resources'}
                showCanals={filters?.showCanals}
                showWaterbodies={filters?.showWaterbodies}
                showMicro={filters?.showMicro}
                showRecharge={showRecharge}
                rechargeRecords={rechargeRecords}
                canalFilter={canalFilter}
                waterbodyFilter={waterbodyFilter}
                microData={microData}
                layerColors={layerColors}
                onStructureClick={(structure) => handleLocationClick({ lat: structure.latitude || structure.lat, lng: structure.longitude || structure.lng }, [structure])}
                onLoading={handleVectorLoading}
            />

            {/* Drill-down Boundaries (GP, Village) — show if block is selected */}
            {(filters?.block) && (
                <DrillDownBoundariesLayer
                    key={`drill-wms-${filters?.block}-${filters?.gramPanchayat}`}
                    filters={filters}
                    currentLevel={currentLevel}
                />
            )}

            {/* WMS-based Selection Highlights — district (blue), block (green), GP (amber) */}
            {(filters?.district || filters?.block) && (
                <WmsSelectionHighlight filters={filters} />
            )}
        </>
    );
};

export default React.memo(MapLayerRenderer);
