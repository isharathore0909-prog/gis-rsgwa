import React from 'react';
import { GeoJSON, Pane } from 'react-leaflet';
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
    // Filter blocks to only show the selected block if one is selected
    const filteredData = React.useMemo(() => {
        if (!data || !filters?.block) return data;

        const features = data.features.filter(f => {
            const name = f.properties.BLOCK_NAME || f.properties.Block;
            return name?.toString().toLowerCase() === filters.block.toLowerCase();
        });

        return { ...data, features };
    }, [data, filters?.block]);

    if (!data) return null;

    return (
        <Pane name="blockBoundaryPane" style={{ zIndex: 1000 }}>
            <GeoJSON
                key={`geojson-${filters?.type}-${legendFeature}-${filters?.district || 'all'}-${filters?.block || 'all'}`}
                ref={geoJsonRef}
                data={filteredData}
                style={(feature) => {
                    const isThematic = ['Ground Water Resource Estimation', 'Rainfall'].includes(filters?.type);

                    // Check if this block is selected
                    const blockName = feature.properties.BLOCK_NAME || feature.properties.Block;
                    const isSelected = filters?.block && blockName &&
                        filters?.type !== 'Ground Water Resource Estimation' &&
                        blockName.toString().trim().toUpperCase() === filters.block.toString().trim().toUpperCase();

                    let val;
                    if (isThematic) {
                        const propKey = filters?.type === 'Ground Water Resource Estimation' ? (legendFeature || 'Category') : legendFeature;
                        val = getFeatureProperty(feature, propKey);

                        // Robust fallback for GWRE - handles various potential property names and case differences
                        if (filters?.type === 'Ground Water Resource Estimation' && (val === undefined || val === null)) {
                            val = getFeatureProperty(feature, 'Category') ||
                                getFeatureProperty(feature, 'category') ||
                                getFeatureProperty(feature, 'block_status') ||
                                getFeatureProperty(feature, 'block_stat') ||
                                getFeatureProperty(feature, 'BLOCK_STATUS') ||
                                getFeatureProperty(feature, 'BLOCK_STAT') ||
                                getFeatureProperty(feature, 'GWDL') ||
                                getFeatureProperty(feature, 'status');
                        }
                    }

                    const hasData = val !== null && val !== undefined && val !== "" && val !== "No Data" && val !== "Unknown";

                    if (isSelected) {
                        return {
                            fillColor: isThematic ? getFeatureColor(val, legendData) : 'transparent',
                            weight: 3.5,
                            color: '#059669', // Emerald highlight to match SelectionHighlightLayer
                            fillOpacity: isThematic ? (hasData ? 0.9 : 0) : 0, // No fill for selection unless thematic
                            dashArray: ''
                        };
                    }

                    return {
                        fillColor: isThematic && hasData ? getFeatureColor(val, legendData) : 'transparent',
                        weight: 1,
                        color: isThematic ? '#64748b' : '#cbd5e1',
                        fillOpacity: isThematic ? (hasData ? 0.75 : 0) : 0,
                        fill: true
                    };
                }}
                onEachFeature={(feature, layer) => {
                    const isThematic = ['Ground Water Resource Estimation', 'Rainfall'].includes(filters?.type);
                    let val;
                    if (isThematic) {
                        const propKey = filters?.type === 'Ground Water Resource Estimation' ? (legendFeature || 'Category') : legendFeature;
                        val = getFeatureProperty(feature, propKey);

                        // Robust fallback for GWRE - same logic as above for consistency
                        if (filters?.type === 'Ground Water Resource Estimation' && (val === undefined || val === null)) {
                            val = getFeatureProperty(feature, 'Category') ||
                                getFeatureProperty(feature, 'category') ||
                                getFeatureProperty(feature, 'block_status') ||
                                getFeatureProperty(feature, 'block_stat') ||
                                getFeatureProperty(feature, 'BLOCK_STATUS') ||
                                getFeatureProperty(feature, 'BLOCK_STAT') ||
                                getFeatureProperty(feature, 'GWDL') ||
                                getFeatureProperty(feature, 'status');
                        }
                    }
                    layer.on({
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
        </Pane>
    );
});

/**
 * Dynamic Drill-down Boundaries Layer
 */
export const DrillDownBoundariesLayer = ({
    data,
    filters,
    legendFeature,
    legendData,
    currentLevel,
    onFiltersApply,
    onLocationClick,
    geoJsonRef
}) => {
    if (!data) return null;

    return (
        <GeoJSON
            key={`dynamic-drill-${data.features?.length || 0}-${filters?.district}-${filters?.block}-${filters?.gramPanchayat}-${filters?.village}-${currentLevel}`}
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

                // Only show boundaries for the CURRENT level of exploration.
                // If nothing selected -> show districts.
                // If district selected -> show blocks.
                // If block selected -> show gps.
                // If gp selected -> show villages.
                let isRelevantLevel = false;
                if (!filters?.district) isRelevantLevel = isDist;
                else if (!filters?.block) isRelevantLevel = isBlock;
                else if (!filters?.gramPanchayat) isRelevantLevel = ['gp', 'GP', 'grampanchayat', 'gram_panchayat'].includes(level);
                else isRelevantLevel = level === 'village' || level === 'VILLAGE';

                // CRITICAL: Even if level matches, verify PARENT matches to prevent ghosts
                // from the previous district/block showing at the wrong coordinates.
                // This check only applies to block-level features when a district is selected.
                if (isRelevantLevel && filters?.district && isBlock) {
                    const featDist = (feature.properties.DIST_NAME || feature.properties.District || feature.properties.district || '').toString().toUpperCase();
                    if (featDist && featDist.replace(/[^A-Z0-9]/g, '') !== filters.district.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
                        isRelevantLevel = false;
                    }
                }

                if (!isRelevantLevel) {
                    return {
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        color: 'transparent',
                        weight: 0,
                        interactive: false
                    };
                }

                const isThematic = filters?.type === 'Rainfall';
                let val;
                if (isThematic && legendFeature) {
                    val = feature.properties[legendFeature] ?? feature.properties.avg_rainfall;
                }
                const hasData = val !== null && val !== undefined && val !== "No Data";

                return {
                    fillColor: isThematic ? (hasData ? getFeatureColor(val, legendData) : 'transparent') : 'transparent',
                    fillOpacity: isThematic ? (hasData ? 0.75 : 0) : 0,
                    color: isDist ? '#1e40af' : (isThematic ? '#64748b' : '#059669'),
                    weight: isDist ? 2.5 : (isThematic ? 1 : 2)
                };
            }}
            onEachFeature={(feature, layer) => {
                const props = feature.properties;
                const level = props.level || currentLevel;
                const name = props.name || props.BLOCK_NAME ||
                    props.DIST_NAME || props.vllg_name || props.v_name || 'Unknown';

                // Only handle tooltips and clicks for the level currently being explored
                let isRelevantLevel = false;
                if (!filters?.district) isRelevantLevel = level === 'district';
                else if (!filters?.block) isRelevantLevel = level === 'block';
                else if (!filters?.gramPanchayat) isRelevantLevel = ['gp', 'GP', 'grampanchayat', 'gram_panchayat'].includes(level);
                else isRelevantLevel = level === 'village' || level === 'VILLAGE';

                if (!isRelevantLevel) return;

                // Bind tooltip with level info

                layer.on({
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
                        else if (level === 'village' || level === 'VILLAGE') onFiltersApply({ ...nextFilters, village: name });

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
