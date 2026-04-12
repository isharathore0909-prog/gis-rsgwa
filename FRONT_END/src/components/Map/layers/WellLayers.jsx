import React from 'react';
import { PiezometerMarker, AquiferWellMarker } from '../Markers';

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

export const AquiferMarkersLayer = React.memo(({
    isActive,
    records,
    onLocationClick
}) => {
    if (!isActive || !records.length) return null;

    return (
        <>
            {records.map((record) => (
                record.latitude && record.longitude && (
                    <AquiferWellMarker
                        key={`aq-${record.well_id || record.id}`}
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
});
