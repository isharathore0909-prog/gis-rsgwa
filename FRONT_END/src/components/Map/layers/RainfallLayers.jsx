import React, { useMemo } from 'react';
import { GeoJSON, CircleMarker, Tooltip, WMSTileLayer } from 'react-leaflet';
import L from 'leaflet';
import { BLUE_PALETTE } from '../../../constants/mapConstants';
import { GEOSERVER_CONFIG } from '../../../api/config';
import { getFeatureColor } from '../../../utils/mapUtils';

import { normalizeDistrictName } from '../../../utils/namingUtils';

/**
 * Rainfall District Choropleth Layer using WMS
 * Renders district boundaries themed by average rainfall from the DB.
 */
export const RainfallDistrictChoroplethLayer = ({
    isActive,
    filters
}) => {
    if (!isActive) return null;

    const cql = React.useMemo(() => {
        if (filters?.district) {
            return `name ILIKE '${filters.district.replace("'", "''")}'`;
        }
        return null;
    }, [filters?.district]);

    return (
        <WMSTileLayer
            key={`rainfall-wms-${cql || 'all'}`}
            url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
            layers="rgwcma:rainfall_choropleth"
            format="image/png"
            transparent={true}
            zIndex={420}
            params={{
                styles: '',
                ...(cql ? { cql_filter: cql } : {})
            }}
        />
    );
};


export const getRainfallColor = (mm) => {
    if (mm === null || mm === undefined) return '#cbd5e1';
    if (mm === 0) return BLUE_PALETTE[0];

    if (mm < 2.5) return BLUE_PALETTE[2];
    if (mm < 7.6) return BLUE_PALETTE[4];
    if (mm < 15) return BLUE_PALETTE[6];
    if (mm < 35.6) return BLUE_PALETTE[8];
    if (mm < 64.5) return BLUE_PALETTE[10];
    return BLUE_PALETTE[11];
};

export const RainfallMarkersLayer = ({
    isActive,
    showVillageLevel,
    rainfallPoints,
    stationPoints,
    dataSource = 'village',
    onAddToTable
}) => {
    if (!isActive || !showVillageLevel) return null;
    const dataToDisplay = dataSource === 'station' ? stationPoints : rainfallPoints;
    if (!dataToDisplay || !dataToDisplay.length) return null;

    return (
        <>
            {dataToDisplay.map((record, idx) => {
                const lat = record.latitude || record.station_lat;
                const lon = record.longitude || record.station_lon;
                if (!lat || !lon) return null;

                const rainValue = record.rainfall_mm ?? record.rainfall_in_mm ?? 0;
                const displayName = dataSource === 'station'
                    ? (record.station_name || 'Unknown Station')
                    : (record.village || record.village_name || 'Unknown Village');

                const color = getRainfallColor(rainValue);
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
