import React, { memo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import {
    StateBoundaryLayer, WaterQualityContourLayer,
    RainfallDistrictChoroplethLayer, DamMarkersLayer,
    WaterLevelBubbleLayer, GroundwaterStatusLayer
} from './layers';
import { GWRE_LEGEND, WATER_QUALITY_LEGENDS, WELL_INVENTORY_LEGEND, WATER_RESOURCES_SUB_LAYERS } from '../../config/legendConfig';
import { BLUE_PALETTE } from '../../constants/mapConstants';
import './MapView.css'; // Reuse existing map styles for consistency

// Fixed center and zoom to show whole Rajasthan
// Slightly offset center to the South-East to push map features North-West, away from the bottom-right legend
const RAJASTHAN_CENTER = [26.2, 74.8];
const RAJASTHAN_ZOOM = 6;

/**
 * RajasthanOverviewMap
 * A simplified, independent map for the dashboard overview.
 * It stays focused on the whole state and shows thematic layers on hover.
 */
const RajasthanOverviewMap = memo(({ hoveredMetric, damMarkers = [], gwreFeatures = [] }) => {

    const getLegendData = () => {
        const metric = hoveredMetric || 'gwre'; // Default layer is usually GWRE based on the map view
        switch (metric) {
            case 'gwre':
                return GWRE_LEGEND;
            case 'water_quality':
                return WATER_QUALITY_LEGENDS.EC;
            case 'water_level':
                return WELL_INVENTORY_LEGEND;
            case 'water_resources':
                return [WATER_RESOURCES_SUB_LAYERS.dams];
            case 'rainfall':
                return [
                    { label: '< 2.5 mm', color: BLUE_PALETTE[2] },
                    { label: '2.5 - 7.5 mm', color: BLUE_PALETTE[4] },
                    { label: '7.5 - 15 mm', color: BLUE_PALETTE[6] },
                    { label: '15 - 35 mm', color: BLUE_PALETTE[8] },
                    { label: '35 - 65 mm', color: BLUE_PALETTE[10] },
                    { label: '> 65 mm', color: BLUE_PALETTE[11] },
                ];
            default:
                return [];
        }
    };

    const legendData = getLegendData();

    return (
        <div className="map-container professional-border" style={{ height: '100%', width: '100%', minHeight: '350px', position: 'relative' }}>
            <MapContainer
                center={RAJASTHAN_CENTER}
                zoom={RAJASTHAN_ZOOM}
                style={{ height: '100%', width: '100%', background: 'white' }}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
            >
                {/* State Boundary - thin gray outlines for context */}
                <StateBoundaryLayer isBackground={true} filters={{}} />

                {/* Thematic Layers based on hover */}
                <GroundwaterStatusLayer
                    isActive={!hoveredMetric || hoveredMetric === 'gwre'}
                    filters={{}}
                />

                {(!hoveredMetric || hoveredMetric === 'gwre') && gwreFeatures?.length > 0 && (
                    <GeoJSON
                        key={`gwre-geojson-${gwreFeatures.length}`}
                        data={gwreFeatures}
                        style={{ fillColor: 'transparent', color: 'transparent', weight: 0 }}
                        onEachFeature={(feature, layer) => {
                            const props = feature.properties || {};
                            const block = (props.BLOCK_NAME || props.Block || props.block_name || props.BLOCK || '-').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                            const category = (props.Category || props.GWDL || props.CATEGORY || props.category || props.block_status || '-').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                            const stage = props.STAGE_OF_GW_DEVELOPMENT || props.Stage || props.stage_of_gw_development || props.stage_of_g || '-';

                            layer.bindTooltip(`
                                <div style="text-align: left; padding: 4px;">
                                    <strong style="color: #64748b;">Block:</strong> ${block}<br/>
                                    <strong style="color: #64748b;">Category:</strong> ${category}<br/>
                                    <strong style="color: #64748b;">Stage of GWRE:</strong> ${stage}
                                </div>
                            `, {
                                sticky: true,
                                className: 'gwre-tooltip'
                            });
                        }}
                    />
                )}

                <WaterQualityContourLayer
                    isActive={hoveredMetric === 'water_quality'}
                    parameter="ec"
                    filters={{}}
                    label="EC"
                />

                <RainfallDistrictChoroplethLayer
                    isActive={hoveredMetric === 'rainfall'}
                    filters={{}}
                />

                <DamMarkersLayer
                    isActive={hoveredMetric === 'water_resources'}
                    damMarkers={damMarkers}
                    color="#0ea5e9"
                />

                <WaterLevelBubbleLayer
                    isActive={hoveredMetric === 'water_level'}
                    filters={{}}
                />
            </MapContainer>

            {/* Static Legend Overlay */}
            {legendData && legendData.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        zIndex: 1000,
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '10px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                        maxWidth: '200px'
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
                        Legend
                    </div>
                    <div>
                        {legendData.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '11px', color: '#334155' }}>
                                <span style={{ width: '14px', height: '14px', backgroundColor: item.color, display: 'inline-block', marginRight: '8px', border: '1px solid #cbd5e1', borderRadius: '2px' }} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default RajasthanOverviewMap;
