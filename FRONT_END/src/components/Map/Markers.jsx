import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

export const DamMarker = React.memo(({ dam, coordinate, onDamClick, onAddToTable, color = '#0ea5e9' }) => {
    const iconHtml = `
        <svg class="dam-icon-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 12 2 12 2C12 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="${color}" stroke="white" stroke-width="2"/>
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

    if (!coordinate || !coordinate.lat || !coordinate.lng) return null;

    return (
        <Marker
            position={[coordinate.lat, coordinate.lng]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onDamClick && onDamClick(dam);
                    onAddToTable && onAddToTable(dam);
                }
            }}
        />
    );
});

export const WellMarker = React.memo(({ well, color, onMarkerClick }) => {
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    if (!well || !well.lat || !well.lng) return null;

    return (
        <Marker
            position={[well.lat, well.lng]}
            icon={customIcon}
            eventHandlers={{
                click: () => onMarkerClick(well)
            }}
        />
    );
});

export const AquiferWellMarker = React.memo(({ record, onMarkerClick }) => {
    // Blue marker for Aquifer/Well Inventory
    const color = '#3b82f6';

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

    if (!record.latitude || !record.longitude) return null;

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        />
    );
});

export const WaterLevelBubbleMarker = ({ record, onMarkerClick }) => {
    const calculateLatestWaterLevel = (rec) => {
        const years = Array.from({ length: 10 }, (_, i) => 2024 - i);
        for (let year of years) {
            const pre = rec[`pre_${year}`];
            const pst = rec[`pst_${year}`];
            const preVal = (pre != null && pre !== '') ? parseFloat(pre) : null;
            const pstVal = (pst != null && pst !== '') ? parseFloat(pst) : null;
            if (preVal !== null && pstVal !== null) return (preVal + pstVal) / 2;
            if (preVal !== null) return preVal;
            if (pstVal !== null) return pstVal;
        }
        if (rec.water_level_m) return parseFloat(rec.water_level_m);
        return 0;
    };

    const getBubbleColor = (depth) => {
        if (depth <= 0) return '#cbd5e1';
        if (depth < 5) return '#3b82f6';  // Blue – good availability
        if (depth < 10) return '#60a5fa';  // Light blue
        if (depth < 20) return '#f59e0b';  // Amber – warning
        if (depth < 30) return '#ef4444';  // Red – stress
        return '#b91c1c';                  // Dark red – high stress
    };

    const depthValue = calculateLatestWaterLevel(record);
    const size = Math.min(Math.max(16, depthValue * 1.5), 48);
    const color = getBubbleColor(depthValue);

    const customIcon = L.divIcon({
        className: 'water-level-marker',
        html: `
            <div style="
                background-color: ${color};
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 1.5px solid ${color};
                opacity: 0.5;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background-color: ${color};
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    border: 1px solid white;
                    opacity: 1;
                "></div>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });

    if (!record.latitude || !record.longitude) return null;

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        />
    );
};

export const RainfallMarker = ({ record, onMarkerClick }) => {
    const getRainfallColor = (mm) => {
        if (mm === 0) return '#cbd5e1';
        if (mm < 2.5) return '#93c5fd';
        if (mm < 7.6) return '#3b82f6';
        if (mm < 35.6) return '#2563eb';
        return '#1e40af';
    };

    const rainValue = record.rainfall_mm ?? record.rainfall_in_mm ?? 0;
    const color = getRainfallColor(rainValue);
    const size = Math.min(Math.max(24, rainValue * 2), 48);

    const customIcon = L.divIcon({
        className: 'rainfall-marker',
        html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; opacity: 0.9; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; box-shadow: 0 0 12px ${color};">${rainValue > 0 ? rainValue.toFixed(1) : '0'}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });

    if (!record.latitude || !record.longitude) return null;

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        />
    );
};


export const PiezometerMarker = ({ record, onMarkerClick }) => {
    const color = '#9333ea';

    const customIcon = L.divIcon({
        className: 'piezometer-marker',
        html: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
                <path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });

    if (!record.latitude || !record.longitude) return null;

    return (
        <Marker
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick && onMarkerClick(record, e.latlng);
                }
            }}
        />
    );
};

export const RechargeMarker = React.memo(({ structure, coordinate, onStructureClick, color = '#22c55e' }) => {
    const iconHtml = `
        <svg class="recharge-icon-svg" width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="14" width="18" height="7" rx="1" fill="${color}" stroke="white" stroke-width="1.5"/>
            <path d="M12 2L12 14" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M7 7L12 2L17 7" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="17.5" r="2" fill="white"/>
        </svg>
    `;

    const customIcon = L.divIcon({
        className: 'custom-marker-recharge',
        html: iconHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 28],
        popupAnchor: [0, -30]
    });

    if (!coordinate || !coordinate.lat || !coordinate.lng) return null;

    return (
        <Marker
            position={[coordinate.lat, coordinate.lng]}
            icon={customIcon}
            eventHandlers={{
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onStructureClick && onStructureClick(structure);
                }
            }}
        />
    );
});

