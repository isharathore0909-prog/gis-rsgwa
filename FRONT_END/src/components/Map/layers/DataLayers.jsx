import React, { useEffect, useMemo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
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
import { CircleMarker, Tooltip } from 'react-leaflet';

const getRainfallColor = (mm) => {
    if (mm === 0) return '#cbd5e1'; // No rain
    if (mm < 2.5) return '#93c5fd'; // Light rain
    if (mm < 7.6) return '#3b82f6'; // Moderate rain
    if (mm < 35.6) return '#2563eb'; // Heavy rain
    return '#1e40af'; // Very heavy rain
};

/**
 * Rainfall Markers Layer
 * Optimized to use CircleMarker for better performance with large datasets
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
            {rainfallPoints.map((record, idx) => {
                if (!record.latitude || !record.longitude) return null;

                const rainValue = record.rainfall_mm ?? record.rainfall_in_mm ?? 0;
                const color = getRainfallColor(rainValue);
                // Scale radius slightly with intensity, but keep it small for performance/clutter
                const radius = rainValue === 0 ? 3 : Math.min(Math.max(4, rainValue / 5), 8);

                return (
                    <CircleMarker
                        key={`rainfall-${idx}`}
                        center={[record.latitude, record.longitude]}
                        pathOptions={{
                            fillColor: color,
                            color: 'white',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }}
                        radius={radius}
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e);
                                onAddToTable && onAddToTable(record);
                            }
                        }}
                    >
                        <Tooltip sticky>
                            <div style={{ textAlign: 'center' }}>
                                <strong>{record.village || record.village_name || 'Unknown Village'}</strong><br />
                                <span style={{ color: color }}>
                                    {rainValue.toFixed(1)} mm
                                </span><br />
                                <span style={{ fontSize: '0.8em', color: '#666' }}>
                                    {record.date || record.rainfall_date}
                                </span>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                );
            })}
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
    onAddToTable,
    color
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
                    color={color}
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
    microData,
    layerColors = { canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722" }
}) => {
    const map = useMap();

    useEffect(() => {
        if (map) {
            const handleDragStart = () => {
                map.closeTooltip();
            };
            map.on('dragstart', handleDragStart);
            return () => {
                map.off('dragstart', handleDragStart);
            };
        }
    }, [map]);

    const canalStyle = useMemo(() => ({
        color: layerColors.canals,
        weight: 2,
        opacity: 1
    }), [layerColors.canals]);

    const waterbodyStyle = useMemo(() => ({
        fillColor: layerColors.waterbodies,
        fillOpacity: 0.7,
        color: layerColors.waterbodies,
        weight: 1
    }), [layerColors.waterbodies]);

    const microStyle = useMemo(() => ({
        color: layerColors.micro,
        weight: 1,
        fillOpacity: 0.6
    }), [layerColors.micro]);

    if (!isActive) return null;

    return (
        <>
            {showCanals && (
                <VectorGridSlicer
                    key={`canals-${layerColors.canals}`}
                    active={true}
                    dataUrl="/data/canals_opt.json"
                    layerName="canals"
                    filter={canalFilter}
                    style={canalStyle}
                />
            )}
            {showWaterbodies && (
                <VectorGridSlicer
                    key={`waterbodies-${layerColors.waterbodies}`}
                    active={true}
                    dataUrl="/data/waterbodies_opt.json"
                    layerName="waterbodies"
                    filter={waterbodyFilter}
                    style={waterbodyStyle}
                />
            )}
            {showMicro && microData && (
                <GeoJSON
                    key={`micro-layer-${microData.features?.length || 0}-${layerColors.micro}`}
                    data={microData}
                    style={microStyle}
                    onEachFeature={(feature, layer) => {
                        const props = feature.properties;

                        layer.bindTooltip(`
                            <div style="font-weight:bold">Micro Structure</div>
                            ${props.MICRO_ID ? `<div>Micro ID: ${props.MICRO_ID}</div>` : ''}
                            ${props.MACRO_NAME ? `<div>Macro: ${props.MACRO_NAME}</div>` : ''}
                            ${props.DIVISION ? `<div>Division: ${props.DIVISION}</div>` : ''}
                        `, { sticky: false });
                    }}
                />
            )}
        </>
    );
};
