import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, GeoJSON, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import './MapView.css';

// Data
import { groundwaterData } from '../data/groundwaterData';
import { RAJASTHAN_DAMS_DATA } from '../data/damsData';

// Sub-components
import { DamMarker, WellMarker, RainfallMarker, WaterQualityMarker } from './Map/Markers';
import { MapEvents, MapUpdater } from './Map/MapEvents';
import BasinFlowOverlay from './Map/BasinFlowOverlay';

// Utilities
import { getPolygonCentroid, getFeatureColor } from '../utils/mapUtils';

// Icons
import { IconMap, IconLayers } from './Icons';

// API
import api from '../services/api';

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
    rainfallPoints = [],
    initialShowLegend,
    onAddToTable
}) => {
    const mapRef = useRef(null);
    const geoJsonRef = useRef(null);
    const [showLegend, setShowLegend] = useState(false);
    const [selectedDam, setSelectedDam] = useState(null);
    const [legendFeature, setLegendFeature] = useState('GWDL');
    const [numClasses, setNumClasses] = useState(5);
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);



    // Sync legend visibility and defaults
    useEffect(() => {
        if (initialShowLegend) {
            setShowLegend(true);
        }
    }, [initialShowLegend]);

    useEffect(() => {
        if (filters?.type === 'Rainfall') {
            setLegendFeature('avg_rainfall');
        } else {
            setLegendFeature('GWDL');
        }
    }, [filters?.type]);

    // Fetch water quality data when Water Quality layer is selected
    useEffect(() => {
        if (filters?.type !== 'Water Quality') {
            setWaterQualityRecords([]);
            return;
        }

        const fetchWaterQuality = async () => {
            try {
                const params = {};

                if (filters?.district) {
                    params.district = filters.district;
                }

                if (filters?.taluka) {
                    params.block = filters.taluka;
                }

                const data = await api.waterQuality.getRecords(params);
                setWaterQualityRecords(data.results || data || []);
            } catch (error) {
                console.error('Error fetching water quality data:', error);
                setWaterQualityRecords([]);
            }
        };

        fetchWaterQuality();
    }, [filters?.type, filters?.district, filters?.taluka]);


    // Clear selected dam when layer changes away from Water Resources
    useEffect(() => {
        if (filters?.type !== 'Water Resources') {
            setSelectedDam(null);
        }
    }, [filters?.type]);

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
    const THEMATIC_PALETTE = ['#0066cc', '#00ccff', '#00ff99', '#ffff00', '#ff9900', '#ff3300', '#cc0000'];
    const BLUE_PALETTE = ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

    // Feature Options (Dynamic based on layer)
    const featureOptions = useMemo(() => {
        if (filters?.type === 'Rainfall') {
            return [
                { value: 'avg_rainfall', label: 'Average Rainfall (mm)' },
                { value: 'total_rainfall', label: 'Total Rainfall (mm)' },
                { value: 'count', label: 'Reading Count' },
                { value: 'Village', label: 'Village Name' }
            ];
        }



        return [
            { value: 'GWDL', label: 'Ground Water Development Level' },
            { value: 'BLOCK_NAME', label: 'Block Name' },
            { value: 'DIST_NAME', label: 'District Name' },
            { value: 'POPULATION', label: 'Population' },
            { value: 'AREA_SQ_KM', label: 'Area (sq km)' },
            { value: 'Dyna_mcm', label: 'Dynamic GW (mcm)' },
            { value: 'Static_mcm', label: 'Static GW (mcm)' },
            { value: 'Vill_Tow_C', label: 'Village Count' }
        ];
    }, [filters?.type]);

    // Determine data source based on selected feature
    const isBlockFeature = ['GWDL', 'BLOCK_NAME', 'DIST_NAME', 'POPULATION', 'AREA_SQ_KM', 'Dyna_mcm', 'Static_mcm', 'Vill_Tow_C'].includes(legendFeature);

    // Rainfall Data Enrichment & Aggregation for Map
    const mapRainfallPoints = useMemo(() => {
        if (filters?.type !== 'Rainfall' || !rainfallPoints.length) return [];

        // 1. Map Block Centroids for lookup
        const blockCentroids = {};
        if (blockBoundaryData && blockBoundaryData.features) {
            blockBoundaryData.features.forEach(f => {
                const bName = (f.properties.BLOCK_NAME || f.properties.Block || '').toUpperCase();
                const dName = (f.properties.DIST_NAME || f.properties.District || '').toUpperCase();
                const key = `${dName}|${bName}`;
                if (!blockCentroids[key]) {
                    blockCentroids[key] = getPolygonCentroid(f.geometry);
                }
            });
        }

        // 2. Aggregate points by location (Village + GP) for map display
        const locationStats = {};

        rainfallPoints.forEach(p => {
            const vName = (p.village_name || p.village || 'Unknown').toUpperCase();
            const gpName = (p.gram_panchayat_name || p.gram_panchayat || p.gramPanchayat || 'Unknown').toUpperCase();
            const bName = (p.block_name || p.block || p.BLOCK_NAME || '').toUpperCase();
            const dName = (p.district_name || p.district || p.DIST_NAME || '').toUpperCase();
            const locKey = `${dName}|${bName}|${gpName}|${vName}`;

            if (!locationStats[locKey]) {
                let lat = p.latitude;
                let lng = p.longitude;

                if (!lat || !lng) {
                    const center = blockCentroids[`${dName}|${bName}`];
                    const hash = locKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const jitterLat = ((hash % 10) - 5) * 0.005;
                    const jitterLng = (((hash * 7) % 10) - 5) * 0.005;

                    lat = center ? center.lat + jitterLat : 26.9124 + jitterLat;
                    lng = center ? center.lng + jitterLng : 75.7873 + jitterLng;
                }

                locationStats[locKey] = {
                    ...p,
                    latitude: lat,
                    longitude: lng,
                    total_rainfall: 0,
                    count: 0,
                    isAggregated: true
                };
            }

            const val = p.rainfall_mm ?? p.rainfall_in_mm ?? 0;
            locationStats[locKey].total_rainfall += val;
            locationStats[locKey].count += 1;
        });

        return Object.values(locationStats).map(s => ({
            ...s,
            avg_rainfall: s.total_rainfall / s.count,
            rainfall_mm: s.total_rainfall / s.count
        }));
    }, [filters?.type, rainfallPoints, blockBoundaryData]);

    // Calculate Legend Data
    const legendData = useMemo(() => {
        let values = [];

        // Handle Rainfall Data
        if (filters?.type === 'Rainfall') {
            if (!mapRainfallPoints || mapRainfallPoints.length === 0) return [];
            const feature = ['total_rainfall', 'avg_rainfall', 'count'].includes(legendFeature) ? legendFeature : 'avg_rainfall';
            values = mapRainfallPoints.map(p => p[feature]);
        }

        // Handle Block Features
        else if (isBlockFeature) {
            if (!blockBoundaryData) return [];
            values = blockBoundaryData.features.map(f => f.properties[legendFeature]);
        }
        // Fallback to Groundwater Well Data
        else {
            values = groundwaterData.map(d => d[legendFeature]);
        }

        values = values.filter(v => v !== null && v !== undefined);
        if (values.length === 0) return [];

        const isCategorical = typeof values[0] === 'string';

        if (isCategorical) {
            const uniqueValues = [...new Set(values)].sort();
            return uniqueValues.map((val, i) => {
                let color;
                if (legendFeature === 'GWDL' || filters?.type === 'Ground Water Resource Estimation') {
                    const status = String(val).trim().toLowerCase();
                    if (status.includes('safe')) color = '#28a745';
                    else if (status.includes('semi')) color = '#ffc107';
                    else if (status.includes('critical')) color = '#fd7e14';
                    else if (status.includes('over')) color = '#dc3545';
                    else if (status.includes('saline')) color = '#6c757d';
                    else color = '#3388ff';
                } else {
                    const palette = filters?.type === 'Rainfall' ? BLUE_PALETTE : THEMATIC_PALETTE;
                    color = palette[i % palette.length];
                }
                return { label: val, value: val, color, isCategorical: true };
            });
        } else {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;
            const steps = numClasses;
            const step = range / steps;

            return Array.from({ length: steps }, (_, i) => {
                const rangeMin = min + (i * step);
                const rangeMax = min + ((i + 1) * step);
                const palette = filters?.type === 'Rainfall' ? BLUE_PALETTE : THEMATIC_PALETTE;
                const colorIndex = Math.min(Math.floor((i / steps) * palette.length), palette.length - 1);

                return {
                    min: rangeMin,
                    max: rangeMax,
                    color: palette[colorIndex],
                    label: `${rangeMin.toFixed(1)} - ${rangeMax.toFixed(1)}`,
                    isCategorical: false
                };
            });
        }
    }, [legendFeature, numClasses, blockBoundaryData, isBlockFeature, filters?.type, mapRainfallPoints]);

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
        return filters?.type === 'Ground Water Resource Estimation';
    }, [blockBoundaryData, filters?.type]);

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

                {damMarkers.map((dam, idx) => (
                    dam.coordinate ? (
                        <DamMarker
                            key={`${dam.name}-${dam.district}-${idx}`}
                            dam={dam}
                            coordinate={dam.coordinate}
                            onDamClick={setSelectedDam}
                            onAddToTable={onAddToTable}
                        />
                    ) : null
                ))}

                {filters?.type === 'Rainfall' && mapRainfallPoints.map((record, idx) => (
                    record.latitude && record.longitude && (
                        <RainfallMarker key={`rainfall-${idx}`} record={record} />
                    )
                ))}

                {filters?.type === 'Water Resources' && selectedDam && (
                    <BasinFlowOverlay dam={selectedDam} coordinate={selectedDam.coordinate} />
                )}

                {filters?.type === 'Water Quality' && waterQualityRecords.map((record, idx) => (
                    record.latitude && record.longitude && (
                        <WaterQualityMarker
                            key={`wq-${record.id || idx}`}
                            record={record}
                            onMarkerClick={(rec, latlng) => {
                                onLocationClick(latlng, [{
                                    ...rec,
                                    id: rec.well_id,
                                    location: rec.village_name || rec.village?.name || 'Unknown',
                                    type: 'water_quality_well'
                                }]);
                            }}
                        />
                    )
                ))}
            </MapContainer>

            {/* Data Availability Warning */}
            {filters?.type && !['Rainfall', 'Water Resources', 'Ground Water Resource Estimation', 'Aquifer'].includes(filters.type) && (
                <div className="map-warning-overlay animated-fade-in">
                    <div className="warning-content">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-text">
                            <h3>Map Visualization Not Available</h3>
                            <p>Spatial data for <strong>{filters.type}</strong> is currently being processed. Please refer to the <strong>Data Analysis Sidebar</strong> for detailed statistics and reports.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Controls */}
            <div className="map-controls-overlay">
                <button onClick={handleResetView} title="Reset View"><IconMap /></button>
                <div className="zoom-controls">
                    <button onClick={handleZoomIn}>+</button>
                    <button onClick={handleZoomOut}>-</button>
                </div>
                <button onClick={handleFullscreen} title="Toggle Fullscreen">⛶</button>
            </div>

            {/* Premium Legend Header (Floating Button) */}
            <div
                className={`map-legend-toggle ${showLegend ? 'active' : ''}`}
                onClick={toggleLegend}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '25px',
                    backgroundColor: 'white',
                    padding: '8px 16px',
                    borderRadius: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    zIndex: 1100,
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <IconLayers size={18} color={showLegend ? '#3b82f6' : '#64748b'} stroke={2} />
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    letterSpacing: '0.05em'
                }}>LEGEND</span>
                <span style={{
                    fontSize: '1rem',
                    color: '#94a3b8',
                    marginLeft: '4px'
                }}>{showLegend ? '−' : '+'}</span>
            </div>

            {/* Professional Legend Widget */}
            {showLegend && (
                <div className="legend-widget animated-fade-in" style={{ bottom: '75px', right: '25px' }}>
                    <div className="legend-header">
                        <div className="header-left">
                            <IconLayers className="header-icon" size={18} />
                            <h4>Thematic Layers</h4>
                        </div>
                        <button className="legend-hide-btn" onClick={toggleLegend}>Hide</button>
                    </div>

                    <div className="legend-controls-row">
                        <select
                            className="legend-select"
                            value={legendFeature}
                            onChange={e => setLegendFeature(e.target.value)}
                        >
                            {featureOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <div className="classes-selector">
                            <label>Steps</label>
                            <select
                                className="tiny-select"
                                value={numClasses}
                                onChange={e => setNumClasses(parseInt(e.target.value))}
                            >
                                {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="legend-items">
                        {legendData.length > 0 ? (
                            legendData.map((item, i) => (
                                <div key={i} className="legend-row">
                                    <span className="legend-swatch" style={{ backgroundColor: item.color }}></span>
                                    <span className="legend-label">{item.label}</span>
                                </div>
                            ))
                        ) : (
                            <div className="legend-context">No thematic data available for selected layer</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapView;
