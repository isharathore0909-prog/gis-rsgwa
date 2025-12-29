import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import './MapView.css';
import { groundwaterData, getWaterLevelColor, getWellStatus } from '../data/groundwaterData';

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map updates and expose map instance
function MapUpdater({ center, zoom, basemap, onMapReady }) {
    const map = useMap();
    
    useEffect(() => {
        if (onMapReady) {
            onMapReady(map);
        }
    }, [map, onMapReady]);
    
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);

    useEffect(() => {
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });

        if (basemap === 'satellite') {
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors, © CARTO',
                maxZoom: 19
            }).addTo(map);
        } else {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
        }
    }, [basemap, map]);

    return null;
}

// Custom marker component
const WellMarker = ({ well, onMarkerClick }) => {
    const markerColor = getWaterLevelColor(well.waterLevel);
    
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${markerColor}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
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

const MapView = ({ layers, basemap, onWellSelect, selectedWell }) => {
    const mapRef = useRef(null);

    const handleMapReady = (map) => {
        mapRef.current = map;
    };

    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    const handleResetView = () => {
        if (mapRef.current) {
            mapRef.current.setView([28.6139, 77.2090], 10);
        }
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // Sample contour data
    const contourData = [
        [[28.5, 77.1], [28.6, 77.2], [28.7, 77.15]],
        [[28.4, 77.2], [28.5, 77.3], [28.6, 77.25]],
    ];

    return (
        <div className="map-container">
            <MapContainer
                center={[28.6139, 77.2090]}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <MapUpdater 
                    center={[28.6139, 77.2090]} 
                    zoom={10} 
                    basemap={basemap}
                    onMapReady={handleMapReady}
                />
                
                {layers.wells && groundwaterData.map(well => (
                    <WellMarker 
                        key={well.id} 
                        well={well} 
                        onMarkerClick={onWellSelect}
                    />
                ))}

                {layers.contours && (
                    <Polyline
                        positions={contourData}
                        pathOptions={{ color: '#0066cc', weight: 2, opacity: 0.7 }}
                    />
                )}

                {layers.quality && (
                    <Circle
                        center={[28.6139, 77.2090]}
                        radius={10000}
                        pathOptions={{ color: '#28a745', fillColor: '#28a745', fillOpacity: 0.2 }}
                    />
                )}
            </MapContainer>

            {/* Map Controls */}
            <div className="map-controls">
                <button className="map-control-btn" onClick={handleZoomIn} title="Zoom In">+</button>
                <button className="map-control-btn" onClick={handleZoomOut} title="Zoom Out">−</button>
                <button className="map-control-btn" onClick={handleResetView} title="Reset View">⌂</button>
                <button className="map-control-btn" onClick={handleFullscreen} title="Fullscreen">⛶</button>
            </div>

            {/* Info Panel */}
            {selectedWell && (
                <div className="info-panel active">
                    <div className="info-header">
                        <h4>Well Information</h4>
                        <button className="close-btn" onClick={() => onWellSelect(null)}>×</button>
                    </div>
                    <div className="info-content">
                        <h4 style={{ color: '#1e3c72', marginBottom: '10px' }}>{selectedWell.id}</h4>
                        <p><strong>Location:</strong> {selectedWell.location}</p>
                        <p><strong>Coordinates:</strong> {selectedWell.lat.toFixed(4)}, {selectedWell.lng.toFixed(4)}</p>
                        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
                        <p><strong>Water Level:</strong> {selectedWell.waterLevel} m</p>
                        <p><strong>pH:</strong> {selectedWell.ph}</p>
                        <p><strong>Total Dissolved Solids:</strong> {selectedWell.tds} mg/L</p>
                        <p><strong>Nitrate:</strong> {selectedWell.nitrate} mg/L</p>
                        <p><strong>Fluoride:</strong> {selectedWell.fluoride} mg/L</p>
                        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
                        <p><strong>Status:</strong> <span className={`status-${getWellStatus(selectedWell).class}`}>{getWellStatus(selectedWell).text}</span></p>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="legend">
                <h4>Water Level (m)</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#0066cc' }}></span>
                        <span>&lt; 5</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#00ccff' }}></span>
                        <span>5 - 10</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#00ff99' }}></span>
                        <span>10 - 15</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#ffff00' }}></span>
                        <span>15 - 20</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#ff9900' }}></span>
                        <span>20 - 25</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#ff3300' }}></span>
                        <span>&gt; 25</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapView;

