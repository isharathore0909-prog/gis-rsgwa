import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export const DamMarker = ({ dam, coordinate, onDamClick }) => {
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
                click: () => onDamClick(dam)
            }}
        >
            <Popup className="dam-popup-wrapper">
                <div className="dam-popup-container">
                    <div className="dam-popup-header">
                        <h3>{dam.name}</h3>
                        <span className="dam-type-badge">{dam.type || 'Dam'}</span>
                    </div>

                    <div className="dam-popup-body">
                        <div className="dam-popup-grid">
                            <div className="dam-info-item"><span className="dam-label">River</span><span className="dam-value">{dam.river || 'N/A'}</span></div>
                            <div className="dam-info-item"><span className="dam-label">Basin</span><span className="dam-value">{dam.basin || 'N/A'}</span></div>
                            <div className="dam-info-item"><span className="dam-label">District</span><span className="dam-value">{dam.district || 'N/A'}</span></div>
                            <div className="dam-info-item"><span className="dam-label">Nearest City</span><span className="dam-value">{dam.block || 'N/A'}</span></div>
                            <div className="dam-info-item full-width"><span className="dam-label">Purpose</span><span className="dam-value">{dam.purpose || 'N/A'}</span></div>
                        </div>

                        {(dam.length || dam.max_height || dam.completion_year) && (
                            <div className="dam-popup-footer">
                                {dam.length && <div className="dam-spec">L: <strong>{dam.length}m</strong></div>}
                                {dam.max_height && <div className="dam-spec">H: <strong>{dam.max_height}m</strong></div>}
                                {dam.completion_year && <div className="dam-spec">Year: <strong>{dam.completion_year}</strong></div>}
                            </div>
                        )}
                    </div>
                </div>
            </Popup>
        </Marker>
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
