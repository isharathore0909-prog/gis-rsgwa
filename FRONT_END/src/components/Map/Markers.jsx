import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export const DamMarker = ({ dam, coordinate, onDamClick, onAddToTable }) => {
    const iconHtml = `
        <svg class="dam-icon-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 12 2 12 2C12 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#0ea5e9" stroke="white" stroke-width="2"/>
            <path d="M7 13C7 13 9.5 15 12 11C14.5 7 17 13 17 13" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 16C8 16 10 17 12 15C14 13 16 16 16 16" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
        </svg>
    `;

    const customIcon = L.divIcon({
        className: 'custom-marker-dam',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
        popupAnchor: [0, -32]
    });

    return (
        <Marker
            position={[coordinate.lat, coordinate.lng]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    // Prevent map click propagation
                    L.DomEvent.stopPropagation(e);

                    // Trigger actions
                    onDamClick && onDamClick(dam);
                    onAddToTable && onAddToTable(dam);
                }
            }}
        />
    );
};

export const WellMarker = ({ well, color, onMarkerClick }) => {
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    return (
        <Marker
            position={[well.lat, well.lng]}
            icon={customIcon}
            eventHandlers={{
                click: () => onMarkerClick(well)
            }}
        >
            <Popup>
                <div style={{ minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1e3c72' }}>{well.id}</h4>
                    <p style={{ margin: '5px 0' }}><strong>Location:</strong> {well.location}</p>
                    <p style={{ margin: '5px 0' }}><strong>Water Level:</strong> {well.waterLevel} m</p>
                    <p style={{ margin: '5px 0' }}><strong>pH:</strong> {well.ph}</p>
                    <p style={{ margin: '5px 0' }}><strong>TDS:</strong> {well.tds} mg/L</p>
                </div>
            </Popup>
        </Marker>
    );
};

export const AquiferWellMarker = ({ record, onMarkerClick }) => {
    // Blue marker for Aquifer/Well Inventory
    const color = '#3b82f6';

    // Create a simple circular marker with a water drop or just a circle
    const customIcon = L.divIcon({
        className: 'aquifer-well-marker',
        html: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="white" fill-opacity="0.5"/>
            </svg>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        >
            <Popup>
                <div style={{ minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#1e3c72' }}>{record.well_id}</h4>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>{record.village_name}</p>
                    <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>Depth: {record.well_depth}m</p>
                </div>
            </Popup>
        </Marker>
    );
};

export const RainfallMarker = ({ record, onMarkerClick }) => {
    // Determine color based on intensity
    const getRainfallColor = (mm) => {
        if (mm === 0) return '#cbd5e1'; // No rain
        if (mm < 2.5) return '#93c5fd'; // Light rain
        if (mm < 7.6) return '#3b82f6'; // Moderate rain
        if (mm < 35.6) return '#2563eb'; // Heavy rain
        return '#1e40af'; // Very heavy rain
    };

    const rainValue = record.rainfall_mm ?? record.rainfall_in_mm ?? 0;
    const dateValue = record.date ?? record.rainfall_date ?? 'N/A';
    const villageValue = record.village ?? record.village_name ?? 'N/A';
    const gpValue = record.gram_panchayat ?? record.gramPanchayat ?? 'N/A';

    const color = getRainfallColor(rainValue);
    const size = Math.min(Math.max(24, rainValue * 2), 48);

    const customIcon = L.divIcon({
        className: 'rainfall-marker',
        html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; opacity: 0.9; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; box-shadow: 0 0 12px ${color};">${rainValue > 0 ? rainValue.toFixed(1) : '0'}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        >
            <Popup>
                <div className="rainfall-popup">
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3c72', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                        {villageValue}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ margin: 0 }}><strong>{record.isAggregated ? 'Average Rainfall' : 'Rainfall'}:</strong> <span style={{ color: '#2563eb', fontSize: '1.2rem', fontWeight: 700 }}>{rainValue.toFixed(1)} mm</span></p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>GP:</strong> {gpValue}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Date:</strong> {dateValue}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Gauge Type:</strong> {record.gauge_type || 'Manual'}</p>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};

export const WaterQualityMarker = ({ record, onMarkerClick }) => {
    // Determine color based on water quality parameters
    const getWQColor = (record) => {
        // Simple quality assessment based on key parameters
        let issues = 0;

        if (record.ph && (record.ph < 6.5 || record.ph > 8.5)) issues++;
        if (record.tds && record.tds > 2000) issues++;
        if (record.fluoride && record.fluoride > 1.5) issues++;
        if (record.nitrate && record.nitrate > 45) issues++;
        if (record.ec && record.ec > 3000) issues++;

        if (issues === 0) return '#2a9d8f'; // Good - Green
        if (issues <= 2) return '#f4a261'; // Warning - Orange
        return '#e63946'; // Critical - Red
    };

    const color = getWQColor(record);

    const customIcon = L.divIcon({
        className: 'water-quality-marker',
        html: `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
                <path d="M12 8v4m0 4h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        />
    );
};
