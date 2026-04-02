import React from 'react';
import { WaterQualityMarker } from '../Markers';

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
