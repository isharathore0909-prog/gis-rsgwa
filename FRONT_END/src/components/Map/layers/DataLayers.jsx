import React, { useEffect, useMemo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import VectorGridSlicer from '../VectorGridSlicer';
import {
    DamMarker,
    RainfallMarker,
    WaterQualityMarker,
    AquiferWellMarker,
    PiezometerMarker
} from '../Markers';
import { BACKEND_API, buildBackendUrl } from '../../../api/config';

/**
 * Rainfall Markers Layer
 */
import { CircleMarker, Tooltip } from 'react-leaflet';

import { BLUE_PALETTE } from '../../../constants/mapConstants';

const getRainfallColor = (mm) => {
    if (mm === null || mm === undefined) return '#cbd5e1'; // No data
    if (mm === 0) return BLUE_PALETTE[0]; // Minimal/no rain

    // Define rainfall intensity thresholds (in mm)
    // Based on IMD classification: Light (0-2.5), Moderate (2.5-7.6), Rather Heavy (7.6-35.6), Heavy (35.6-64.5), Very Heavy (64.5+)
    if (mm < 2.5) return BLUE_PALETTE[2];      // Light rain
    if (mm < 7.6) return BLUE_PALETTE[4];      // Moderate rain
    if (mm < 15) return BLUE_PALETTE[6];       // Rather heavy rain
    if (mm < 35.6) return BLUE_PALETTE[8];     // Heavy rain
    if (mm < 64.5) return BLUE_PALETTE[10];    // Very heavy rain
    return BLUE_PALETTE[11];                    // Extremely heavy rain
};

/**
 * Rainfall Markers Layer
 * Optimized to use CircleMarker for better performance with large datasets
 */
export const RainfallMarkersLayer = ({
    isActive,
    showVillageLevel,
    rainfallPoints,
    stationPoints,      // NEW: Station-based rainfall data
    dataSource = 'village', // NEW: 'village' or 'station'
    onAddToTable
}) => {
    if (!isActive || !showVillageLevel) return null;

    // Select data based on source
    const dataToDisplay = dataSource === 'station' ? stationPoints : rainfallPoints;

    if (!dataToDisplay || !dataToDisplay.length) return null;

    return (
        <>
            {dataToDisplay.map((record, idx) => {
                // Handle both village and station data structures
                const lat = record.latitude || record.station_lat;
                const lon = record.longitude || record.station_lon;

                if (!lat || !lon) return null;

                // Get rainfall value from appropriate field
                const rainValue = record.rainfall_mm ?? record.rainfall_in_mm ?? 0;

                // Get display name
                const displayName = dataSource === 'station'
                    ? (record.station_name || 'Unknown Station')
                    : (record.village || record.village_name || 'Unknown Village');

                const color = getRainfallColor(rainValue);
                // Scale radius slightly with intensity, but keep it small for performance/clutter
                const radius = rainValue === 0 ? 3 : Math.min(Math.max(4, rainValue / 5), 8);

                return (
                    <CircleMarker
                        key={`rainfall-${dataSource}-${idx}`}
                        center={[lat, lon]}
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
                                <strong>{displayName}</strong><br />
                                <span style={{ color: color }}>
                                    {rainValue.toFixed(1)} mm
                                </span><br />
                                <span style={{ fontSize: '0.8em', color: '#666' }}>
                                    {record.date || record.rainfall_date}
                                </span>
                                {dataSource === 'station' && record.station_district && (
                                    <>
                                        <br />
                                        <span style={{ fontSize: '0.8em', color: '#888' }}>
                                            {record.station_district}
                                        </span>
                                    </>
                                )}
                                {dataSource === 'station' && record.record_count && (
                                    <>
                                        <br />
                                        <span style={{ fontSize: '0.75em', color: '#999' }}>
                                            {record.record_count} records
                                        </span>
                                    </>
                                )}
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
    if (!isActive || !records || !records.length) return null;

    return (
        <>
            {records.map((record, idx) => (
                record.latitude && record.longitude && (
                    <WaterQualityMarker
                        key={`wq-${idx}`}
                        record={record}
                        onMarkerClick={(rec, latlng) => onLocationClick(latlng, [{
                            ...rec,
                            id: rec.well_id || rec.id,
                            location: rec.village_name || rec.village || 'Unknown',
                            type: 'water_quality_well'
                        }])}
                    />
                )
            ))}
        </>
    );
};

/**
 * Piezometer Markers Layer
 */
export const PiezometerMarkersLayer = ({
    isActive,
    records,
    onLocationClick
}) => {
    if (!isActive || !records.length) return null;

    return (
        <>
            {records.map((record, idx) => (
                record.latitude && record.longitude && (
                    <PiezometerMarker
                        key={`pz-${idx}`}
                        record={record}
                        onMarkerClick={(rec, latlng) => onLocationClick(latlng, [{
                            ...rec,
                            id: rec.id,
                            location: rec.piezometer_name || (rec.village && (rec.village.name || rec.village)) || 'Unknown',
                            type: 'piezometer'
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
 * Uses static GeoJSON (aquifer_opt.json) which has guaranteed New_Dist & Aquifer properties.
 */
export const AquiferVectorLayer = ({
    isActive,
    district,
    filter,
    style,
    onFeatureClick,
    onLoading
}) => {
    if (!isActive) return null;

    // Use backend's spatially-intersecting (clipped) API if district is selected.
    // Fallback to static optimised file for full state view.
    const dataUrl = district
        ? buildBackendUrl(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS_INTERSECT, {
            layer_type: 'aquifer',
            district
        })
        : '/data/aquifer_opt.json';

    return (
        <VectorGridSlicer
            key={`aquifer-${district || 'all'}`}
            active={isActive}
            dataUrl={dataUrl}
            layerName="aquifer"
            filter={filter}
            style={style}
            onFeatureClick={onFeatureClick}
            onLoading={onLoading}
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
    canalData,
    waterbodyData,
    canalFilter,
    waterbodyFilter,
    microData,
    layerColors = { canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722" },
    onLoading
}) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const handleDragStart = () => {
            // Defensive call to closeTooltip to avoid TypeError if map state is inconsistent
            if (typeof map.closeTooltip === 'function') {
                try {
                    map.closeTooltip();
                } catch (e) {
                    // Silently fail if Leaflet's internal state is wonky during drag
                }
            }
        };

        map.on('dragstart', handleDragStart);
        return () => {
            map.off('dragstart', handleDragStart);
        };
    }, [map]);

    const canalStyle = useMemo(() => ({
        color: layerColors.canals,
        weight: 2.5,
        opacity: 1
    }), [layerColors.canals]);

    const waterbodyStyle = useMemo(() => ({
        fillColor: layerColors.waterbodies,
        fillOpacity: 0.7,
        color: layerColors.waterbodies,
        weight: 1.5
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
                    data={canalData}
                    dataUrl="/data/canals_opt.json"
                    layerName="canals"
                    filter={canalFilter}
                    style={canalStyle}
                    onLoading={onLoading}
                />
            )}
            {showWaterbodies && (
                <VectorGridSlicer
                    key={`waterbodies-${layerColors.waterbodies}`}
                    active={true}
                    data={waterbodyData}
                    dataUrl="/data/waterbodies_opt.json"
                    layerName="waterbodies"
                    filter={waterbodyFilter}
                    style={waterbodyStyle}
                    onLoading={onLoading}
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
