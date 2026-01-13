import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import VectorGridSlicer from '../VectorGridSlicer';
import {
    DamMarker,
    RainfallMarker,
    WaterQualityMarker,
    AquiferWellMarker
} from '../Markers';

/**
 * Rainfall Markers Layer
 */
export const RainfallMarkersLayer = ({
    isActive,
    showVillageLevel,
    rainfallPoints,
    onAddToTable
}) => {
    if (!isActive || !showVillageLevel || !rainfallPoints.length) return null;

    return (
        <>
            {rainfallPoints.map((record, idx) => (
                record.latitude && record.longitude && (
                    <RainfallMarker
                        key={`rainfall-${idx}`}
                        record={record}
                        onMarkerClick={onAddToTable}
                    />
                )
            ))}
        </>
    );
};

/**
 * Raingauge Stations Layer
 */
export const RaingaugeStationsLayer = ({
    isActive,
    showStations,
    data,
    district
}) => {
    if (!isActive || !showStations || !data) return null;

    const filteredData = {
        ...data,
        features: data.features.filter(f => {
            if (!district) return true;
            const dist = (f.properties.DISTRICT || '').toUpperCase();
            return dist === district.toUpperCase();
        })
    };

    return (
        <GeoJSON
            key={`raingauge-stations-${district || 'all'}`}
            data={filteredData}
            pointToLayer={(feature, latlng) => {
                const icon = L.divIcon({
                    className: 'raingauge-station-marker',
                    html: `
                        <div style="
                            background-color: #3b82f6;
                            width: 12px;
                            height: 12px;
                            border-radius: 50%;
                            border: 2px solid white;
                            box-shadow: 0 0 5px rgba(0,0,0,0.5);
                        "></div>
                    `,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });
                return L.marker(latlng, { icon });
            }}
            onEachFeature={(feature, layer) => {
                layer.bindTooltip(`
                    <div style="font-weight:bold">${feature.properties.RAINGAUGE}</div>
                    <div>District: ${feature.properties.DISTRICT}</div>
                    <div>Agency: ${feature.properties.AGENCY}</div>
                `, { sticky: true });
            }}
        />
    );
};

/**
 * Water Quality Markers Layer
 */
export const WaterQualityMarkersLayer = ({
    isActive,
    records,
    onLocationClick
}) => {
    if (!isActive || !records.length) return null;

    return (
        <>
            {records.map((record, idx) => (
                record.latitude && record.longitude && (
                    <WaterQualityMarker
                        key={`wq-${idx}`}
                        record={record}
                        onMarkerClick={(rec, latlng) => onLocationClick(latlng, [{
                            ...rec,
                            id: rec.well_id,
                            location: rec.village_name || 'Unknown',
                            type: 'water_quality_well'
                        }])}
                    />
                )
            ))}
        </>
    );
};

/**
 * Aquifer/Well Inventory Markers Layer
 */
export const AquiferMarkersLayer = ({
    isActive,
    records,
    onLocationClick
}) => {
    if (!isActive || !records.length) return null;

    return (
        <>
            {records.map((record, idx) => (
                record.latitude && record.longitude && (
                    <AquiferWellMarker
                        key={`aq-${idx}`}
                        record={record}
                        onMarkerClick={(rec, latlng) => onLocationClick(latlng, [{
                            ...rec,
                            id: rec.well_id,
                            location: rec.village_name || 'Unknown',
                            type: 'well_inventory_well'
                        }])}
                    />
                )
            ))}
        </>
    );
};

/**
 * Dam Markers Layer
 */
export const DamMarkersLayer = ({
    isActive,
    damMarkers,
    onDamClick,
    onAddToTable
}) => {
    if (!isActive || !damMarkers.length) return null;

    return (
        <>
            {damMarkers.map((dam, idx) => (
                <DamMarker
                    key={`${dam.name}-${idx}`}
                    dam={dam}
                    coordinate={dam.coordinate}
                    onDamClick={onDamClick}
                    onAddToTable={onAddToTable}
                />
            ))}
        </>
    );
};

/**
 * Aquifer Vector Grid Layer
 */
export const AquiferVectorLayer = ({
    isActive,
    filter,
    style,
    onFeatureClick
}) => {
    if (!isActive) return null;

    return (
        <VectorGridSlicer
            active={true}
            dataUrl="/data/aquifer_opt.json"
            layerName="aquifer"
            filter={filter}
            style={style}
            onFeatureClick={onFeatureClick}
        />
    );
};

/**
 * Water Resources Layers (Canals, Waterbodies, Micro)
 */
export const WaterResourcesLayers = ({
    isActive,
    showCanals,
    showWaterbodies,
    showMicro,
    canalFilter,
    waterbodyFilter,
    microData
}) => {
    if (!isActive) return null;

    return (
        <>
            {showCanals && (
                <VectorGridSlicer
                    active={true}
                    dataUrl="/data/canals_opt.json"
                    layerName="canals"
                    filter={canalFilter}
                    style={{ color: "#00bcd4", weight: 2, opacity: 1 }}
                />
            )}
            {showWaterbodies && (
                <VectorGridSlicer
                    active={true}
                    dataUrl="/data/waterbodies_opt.json"
                    layerName="waterbodies"
                    filter={waterbodyFilter}
                    style={{ fillColor: "#0288d1", fillOpacity: 0.7, color: "#01579b", weight: 1 }}
                />
            )}
            {showMicro && microData && (
                <GeoJSON
                    data={microData}
                    style={{ color: '#ff5722', weight: 1, fillOpacity: 0.6 }}
                    onEachFeature={(feature, layer) => {
                        const props = feature.properties;
                        layer.bindTooltip(`
                            <div style="font-weight:bold">Micro Structure</div>
                            ${props.Name ? `<div>Name: ${props.Name}</div>` : ''}
                            ${props.District ? `<div>District: ${props.District}</div>` : ''}
                        `, { sticky: true });
                    }}
                />
            )}
        </>
    );
};
