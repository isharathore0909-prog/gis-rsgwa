import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { getFeatureProperty } from '../../../utils/geoUtils';
import { getFeatureColor } from '../../../utils/mapUtils';

/**
 * Block Boundary Layer with Thematic Styling
 */
export const BlockBoundaryLayer = React.memo(({
    data,
    filters,
    legendFeature,
    legendData,
    geoJsonRef,
    onLocationClick
}) => {
    if (!data) return null;

    return (
        <GeoJSON
            key={`geojson-${filters?.type}-${legendFeature}-${filters?.district || 'all'}`}
            ref={geoJsonRef}
            data={data}
            style={(feature) => {
                const isThematic = ['Ground Water Resource Estimation', 'Rainfall'].includes(filters?.type);

                // Check if this block is selected
                const blockName = feature.properties.BLOCK_NAME || feature.properties.Block;
                const isSelected = filters?.block && blockName &&
                    filters?.type !== 'Ground Water Resource Estimation' &&
                    blockName.toString().trim().toUpperCase() === filters.block.toString().trim().toUpperCase();

                let val;
                if (isThematic) {
                    const propKey = filters?.type === 'Ground Water Resource Estimation' ? 'GWDL' : legendFeature;
                    val = getFeatureProperty(feature, propKey);
                }

                const hasData = val !== null && val !== undefined && val !== "No Data";

                if (isSelected) {
                    return {
                        fillColor: isThematic ? getFeatureColor(val, legendData) : 'transparent',
                        weight: 4,
                        color: '#00ffff', // Cyan highlight
                        fillOpacity: isThematic ? (hasData ? 0.9 : 0) : 0.2,
                        dashArray: ''
                    };
                }

                return {
                    fillColor: isThematic ? (hasData ? getFeatureColor(val, legendData) : 'transparent') : 'transparent',
                    weight: 1,
                    color: isThematic ? '#64748b' : '#cbd5e1',
                    fillOpacity: isThematic ? (hasData ? 0.75 : 0) : 0
                };
            }}
            onEachFeature={(feature, layer) => {
                const isThematic = ['Ground Water Resource Estimation', 'Rainfall'].includes(filters?.type);
                let val;
                if (isThematic) {
                    const propKey = filters?.type === 'Ground Water Resource Estimation' ? 'GWDL' : legendFeature;
                    val = getFeatureProperty(feature, propKey);
                }
                const displayVal = (val !== null && val !== undefined)
                    ? (filters?.type === 'Rainfall' ? `${Number(val).toFixed(1)} mm` : val)
                    : null;

                // Bind tooltip once
                layer.bindTooltip(`
                    <div style="font-weight:bold">${feature.properties.BLOCK_NAME || feature.properties.Block}</div>
                    ${displayVal ? `<div>${displayVal}</div>` : ''}
                `, { sticky: true, className: 'custom-map-tooltip' });

                layer.on({
                    mouseover: e => {
                        const l = e.target;
                        l.setStyle({ weight: 2.5, color: '#475569', fillOpacity: 1 });
                        l.bringToFront();
                    },
                    mouseout: e => {
                        geoJsonRef.current?.resetStyle(e.target);
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
            }}
        />
    );
});

/**
 * Dynamic Drill-down Boundaries Layer
 */
export const DrillDownBoundariesLayer = ({
    data,
    filters,
    currentLevel,
    onFiltersApply,
    onLocationClick,
    geoJsonRef
}) => {
    if (!data || !filters?.village) return null;

    return (
        <GeoJSON
            key={`dynamic-drill-${data.features.length}-${filters?.district}-${filters?.block}-${currentLevel}`}
            ref={geoJsonRef}
            data={data}
            pointToLayer={(_, latlng) => L.circleMarker(latlng, {
                radius: 5,
                fillColor: '#94a3b8',
                color: '#ecfeff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            })}
            style={(feature) => {
                const level = feature.properties.level || currentLevel;
                const isDist = level === 'district';
                const isBlock = level === 'block';
                return {
                    fillColor: isDist ? '#3b82f6' : (isBlock ? '#10b981' : '#f59e0b'),
                    fillOpacity: isDist ? 0.4 : 0.45,
                    color: isDist ? '#172554' : (isBlock ? '#059669' : '#d97706'),
                    weight: isDist ? 3.5 : 2
                };
            }}
            onEachFeature={(feature, layer) => {
                const name = feature.properties.name || feature.properties.BLOCK_NAME ||
                    feature.properties.DIST_NAME || feature.properties.v_name || 'Unknown';
                layer.on({
                    mouseover: e => {
                        const l = e.target;
                        const level = feature.properties.level || currentLevel;
                        const isDist = level === 'district';
                        l.setStyle({
                            fillOpacity: 0.7,
                            weight: isDist ? 5 : 3.5,
                            color: isDist ? '#27272a' : '#047857'
                        });
                        l.bringToFront();
                    },
                    mouseout: e => {
                        geoJsonRef.current?.resetStyle(e.target);
                    },
                    click: e => {
                        if (onLocationClick) {
                            onLocationClick({ lat: e.latlng.lat, lng: e.latlng.lng }, [{
                                id: name,
                                location: name,
                                level: feature.properties.level || currentLevel
                            }]);
                        }

                        const nextFilters = { ...filters };
                        if (!nextFilters.district) onFiltersApply({ ...nextFilters, district: name });
                        else if (!nextFilters.block) onFiltersApply({ ...nextFilters, block: name });
                        else if (!nextFilters.gramPanchayat) onFiltersApply({ ...nextFilters, gramPanchayat: name });
                        else onFiltersApply({ ...nextFilters, village: name });

                        const bounds = e.target.getBounds();
                        if (bounds.isValid()) {
                            e.target._map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
                        }
                    }
                });
            }}
        />
    );
};
