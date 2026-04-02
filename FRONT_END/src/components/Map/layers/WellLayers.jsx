import React from 'react';
import { PiezometerMarker, AquiferWellMarker } from '../Markers';

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
