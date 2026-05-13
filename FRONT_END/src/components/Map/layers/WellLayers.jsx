import React from 'react';
import { WMSTileLayer } from 'react-leaflet';
import { PiezometerMarker } from '../Markers';
import { GEOSERVER_CONFIG } from '../../../api/config';

export const PiezometerMarkersLayer = React.memo(({
    isActive,
    records,
    onLocationClick
}) => {
    if (!isActive || !records.length) return null;

    return (
        <>
            {records.map((record) => (
                record.latitude && record.longitude && (
                    <PiezometerMarker
                        key={`pz-${record.id || record.piezometer_name}`}
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
});

export const WaterLevelBubbleLayer = React.memo(({
    isActive,
    filters,
    onLocationClick
}) => {
    if (!isActive) return null;

    const cql = null; // Removed CQL since aquifer_spatial_view lacks district/block properties. Leaflet's bounding box inherently filters the visible view area instead.

    return (
        <WMSTileLayer
            key={`water-level-wms-${cql || 'state'}`}
            url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
            layers="rgwcma:aquifer_spatial_view"
            styles="well_bubbles"
            format="image/png"
            transparent={true}
            zIndex={405}
            params={{
                ...(cql ? { cql_filter: cql } : {}),
                version: '1.1.1',
                env: "cellSize:40"
            }}
        />
    );
});
