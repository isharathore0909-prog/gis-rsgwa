import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, GeoJSON, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import './MapView.css';

// Data
import { groundwaterData } from '../data/groundwaterData';
import { RAJASTHAN_DAMS_DATA } from '../data/damsData';

// Sub-components
import { DamMarker, WellMarker } from './Map/Markers';
import { MapEvents, MapUpdater } from './Map/MapEvents';
import BasinFlowOverlay from './Map/BasinFlowOverlay';

// Utilities
import { getPolygonCentroid, getFeatureColor } from '../utils/mapUtils';

// Icons
import { IconMap } from './Icons';

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * MapView Component
 * 
 * Main geospatial visualization component using Leaflet.
 */
const MapView = ({
    layers,
    basemap,
    onWellSelect,
    selectedWell,
    onLocationClick,
    filters,
    activeUrlLayers = [],
    blockBoundaryData,
    rajasthanData,
    activeCategory,
    initialShowLegend
}) => {
    const mapRef = useRef(null);
    const geoJsonRef = useRef(null);
    const [showLegend, setShowLegend] = useState(false);
    const [selectedDam, setSelectedDam] = useState(null);
    const [legendFeature, setLegendFeature] = useState('GWDL');
    const [numClasses, setNumClasses] = useState(5);

    useEffect(() => {
        if (initialShowLegend) {
            setShowLegend(true);
        }
    }, [initialShowLegend]);

    // Auto-resize map when container dimensions change
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const observer = new ResizeObserver(() => map.invalidateSize());
        const container = map.getContainer();
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Color Palette
    const PALETTE = ['#0066cc', '#00ccff', '#00ff99', '#ffff00', '#ff9900', '#ff3300', '#cc0000'];

    // Feature Options (Headers)
    const featureOptions = [
        { value: 'GWDL', label: 'Ground Water Development Level' },
        { value: 'BLOCK_NAME', label: 'Block Name' },
        { value: 'DIST_NAME', label: 'District Name' },
        { value: 'POPULATION', label: 'Population' },
        { value: 'AREA_SQ_KM', label: 'Area (sq km)' },
        { value: 'Dyna_mcm', label: 'Dynamic GW (mcm)' },
        { value: 'Static_mcm', label: 'Static GW (mcm)' },
        { value: 'Vill_Tow_C', label: 'Village Count' }
    ];

    // Determine data source based on selected feature
    const isBlockFeature = ['GWDL', 'BLOCK_NAME', 'DIST_NAME', 'POPULATION', 'AREA_SQ_KM', 'Dyna_mcm', 'Static_mcm', 'Vill_Tow_C'].includes(legendFeature);

    // Calculate Legend Data
    const legendData = useMemo(() => {
        let values;
        if (isBlockFeature) {
            if (!blockBoundaryData) return [];
            values = blockBoundaryData.features.map(f => f.properties[legendFeature]);
        } else {
            values = groundwaterData.map(d => d[legendFeature]);
        }

        values = values.filter(v => v !== null && v !== undefined);
        if (values.length === 0) return [];

        const isCategorical = typeof values[0] === 'string';

        if (isCategorical) {
            const uniqueValues = [...new Set(values)].sort();
            return uniqueValues.map((val, i) => {
                let color;
                if (legendFeature === 'GWDL') {
                    const status = String(val).trim().toLowerCase();
                    if (status.includes('safe')) color = '#28a745';
                    else if (status.includes('semi')) color = '#ffc107';
                    else if (status.includes('critical')) color = '#fd7e14';
                    else if (status.includes('over')) color = '#dc3545';
                    else if (status.includes('saline')) color = '#6c757d';
                    else color = '#3388ff';
                } else {
                    color = PALETTE[i % PALETTE.length];
                }
                return { label: val, value: val, color, isCategorical: true };
            });
        } else {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;
            const step = range / numClasses;

            return Array.from({ length: numClasses }, (_, i) => {
                const rangeMin = min + (i * step);
                const rangeMax = min + ((i + 1) * step);
                const colorIndex = Math.floor((i / (numClasses - 1)) * (PALETTE.length - 1));
                return {
                    min: rangeMin,
                    max: rangeMax,
                    color: PALETTE[colorIndex],
                    label: `${rangeMin.toFixed(1)} - ${rangeMax.toFixed(1)}`
                };
            });
        }
    }, [legendFeature, numClasses, blockBoundaryData, isBlockFeature]);

    // Map Interaction Handlers
    const handleMapReady = (map) => (mapRef.current = map);
    const handleZoomIn = () => mapRef.current?.zoomIn();
    const handleZoomOut = () => mapRef.current?.zoomOut();
    const handleResetView = () => mapRef.current?.setView([26.9124, 75.7873], 7);
    const handleFullscreen = () => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen();
    const toggleLegend = () => setShowLegend(!showLegend);

    // Filtered Datasets
    const filteredData = useMemo(() => {
        if (!filters || !filters.district) return groundwaterData;
        return groundwaterData.filter(well => {
            const matchDistrict = well.district?.toUpperCase() === filters.district.toUpperCase();
            const matchTaluka = !filters.taluka || well.taluka?.toUpperCase() === filters.taluka.toUpperCase() || well.block?.toUpperCase() === filters.taluka.toUpperCase();
            return matchDistrict && matchTaluka;
        });
    }, [filters]);

    const filteredBlockBoundaryData = useMemo(() => {
        if (!blockBoundaryData || !filters?.district) return blockBoundaryData;
        return {
            ...blockBoundaryData,
            features: blockBoundaryData.features.filter(f =>
                (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === filters.district.toUpperCase()
            )
        };
    }, [blockBoundaryData, filters?.district]);

    // Auto-center and zoom
    useEffect(() => {
        if (!mapRef.current || !filters) return;
        if (filteredBlockBoundaryData && filteredBlockBoundaryData.features.length > 0 && (filters.district || filters.taluka)) {
            try {
                const bounds = L.geoJSON(filteredBlockBoundaryData).getBounds();
                if (bounds.isValid()) mapRef.current.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
            } catch (err) { console.error(err); }
        } else if (filteredData.length > 0) {
            mapRef.current.flyTo([filteredData[0].lat, filteredData[0].lng], filters?.district ? 10 : 7);
        }
    }, [filteredBlockBoundaryData, filteredData, filters]);

    const showBlockBoundary = useMemo(() => {
        if (!blockBoundaryData) return false;
        const selectedType = filters?.type || '';
        const isLayer2Active = activeUrlLayers.some(layer => layer.id === 2);

        if (isLayer2Active) {
            return (selectedType === 'Ground Water Resource Estimation' || selectedType === 'Ground Water Level') && activeCategory?.type_id !== '3';
        }
        return selectedType === 'Ground Water Resource Estimation' || selectedType === 'Aquifer' || activeUrlLayers.some(l => l.id === 1) || layers?.blockBoundary || !!filters?.district;
    }, [blockBoundaryData, filters, activeUrlLayers, layers, activeCategory]);

    const damMarkers = useMemo(() => {
        if (filters?.type !== 'Water Resources' || !blockBoundaryData) return [];
        const relevantDams = filters.district ? RAJASTHAN_DAMS_DATA.filter(d => d.district?.toLowerCase() === filters.district.toLowerCase()) : RAJASTHAN_DAMS_DATA;

        const blockGeoMap = {};
        blockBoundaryData.features.forEach(f => {
            const dist = (f.properties.DIST_NAME || f.properties.District)?.toLowerCase();
            const block = (f.properties.BLOCK_NAME || f.properties.Block)?.toLowerCase();
            if (dist && block) {
                if (!blockGeoMap[dist]) blockGeoMap[dist] = {};
                blockGeoMap[dist][block] = f.geometry;
            }
        });

        return relevantDams.map(dam => {
            const geometry = blockGeoMap[dam.district?.toLowerCase()]?.[dam.block?.toLowerCase()];
            return geometry ? { ...dam, coordinate: getPolygonCentroid(geometry) } : null;
        }).filter(Boolean);
    }, [filters?.type, filters?.district, blockBoundaryData]);

    return (
        <div className="map-container">
            <MapContainer center={[26.9124, 75.7873]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <MapUpdater center={[26.9124, 75.7873]} zoom={7} basemap={basemap} onMapReady={handleMapReady} />
                <MapEvents onLocationClick={onLocationClick} />

                {/* Basemap Layer */}
                <TileLayer
                    url={basemap === 'imagery-labels' || basemap === 'imagery'
                        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        : basemap === 'streets'
                            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
                            : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                    }
                    attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
                />

                {basemap === 'imagery-labels' && (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        attribution=""
                        zIndex={10}
                    />
                )}

                {rajasthanData && (
                    <GeoJSON
                        data={rajasthanData}
                        style={{
                            fillColor: '#64748b',
                            fillOpacity: 0.1,
                            color: '#475569',
                            weight: 2,
                            dashArray: '5, 5'
                        }}
                    />
                )}

                {showBlockBoundary && filteredBlockBoundaryData && (
                    <GeoJSON
                        key={`geojson-${legendFeature}-${filters?.district || 'all'}-${filteredBlockBoundaryData.features.length}`}
                        ref={geoJsonRef}
                        data={filteredBlockBoundaryData}
                        style={(feature) => ({
                            fillColor: getFeatureColor(feature.properties[legendFeature], legendData),
                            weight: 1.5,
                            opacity: 1,
                            color: 'white',
                            fillOpacity: 0.7
                        })}
                        onEachFeature={(feature, layer) => {
                            layer.on({
                                mouseover: e => {
                                    const l = e.target;
                                    l.setStyle({ weight: 3, color: '#666', fillOpacity: 0.9 });
                                    l.bringToFront();
                                },
                                mouseout: e => {
                                    if (geoJsonRef.current) {
                                        geoJsonRef.current.resetStyle(e.target);
                                    }
                                },
                                click: e => {
                                    const props = e.target.feature.properties;
                                    onLocationClick({ lat: e.latlng.lat, lng: e.latlng.lng }, [{
                                        id: props.BLOCK_NAME || props.Block,
                                        location: props.BLOCK_NAME || props.Block,
                                        district: props.DIST_NAME || props.District
                                    }]);
                                }
                            });
                            layer.bindPopup(`<strong>${feature.properties.BLOCK_NAME || feature.properties.Block}</strong><br/>${legendFeature}: ${feature.properties[legendFeature]}`);
                        }}
                    />
                )}

                {/* Well markers removed per user request */}

                {damMarkers.map(dam => (
                    <DamMarker key={dam.id} dam={dam} coordinate={dam.coordinate} onDamClick={setSelectedDam} />
                ))}

                {selectedDam && <BasinFlowOverlay dam={selectedDam} coordinate={selectedDam.coordinate} />}
            </MapContainer>

            {/* Map Controls */}
            <div className="map-controls-overlay">
                <button onClick={handleResetView} title="Reset View"><IconMap /></button>
                <div className="zoom-controls">
                    <button onClick={handleZoomIn}>+</button>
                    <button onClick={handleZoomOut}>-</button>
                </div>
                <button onClick={handleFullscreen} title="Toggle Fullscreen">⛶</button>
            </div>

            {/* Legend Toggle */}
            <div className={`legend-toggle-btn ${showLegend ? 'active' : ''}`} onClick={toggleLegend}>
                <span className="legend-label">LEGEND</span>
                <span className="toggle-icon">{showLegend ? '−' : '+'}</span>
            </div>

            {/* Dynamic Legend */}
            {showLegend && (
                <div className="map-floating-legend glass-panel animated-fade-in">
                    <div className="legend-header">
                        <div className="legend-title-group">
                            <span className="legend-dot"></span>
                            <h4>Thematic Overlay</h4>
                        </div>
                        <select className="legend-feature-select" value={legendFeature} onChange={e => setLegendFeature(e.target.value)}>
                            {featureOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    <div className="legend-classes-grid">
                        {legendData.map((item, i) => (
                            <div key={i} className="legend-class-item">
                                <span className="class-color" style={{ backgroundColor: item.color }}></span>
                                <span className="class-label">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {!legendData[0]?.isCategorical && (
                        <div className="legend-settings">
                            <label>Intervals:</label>
                            <input type="range" min="3" max="7" value={numClasses} onChange={e => setNumClasses(parseInt(e.target.value))} />
                            <span>{numClasses}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MapView;
