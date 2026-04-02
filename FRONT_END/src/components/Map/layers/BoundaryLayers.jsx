import React from 'react';
import { GeoJSON, Pane } from 'react-leaflet';
import { getFeatureProperty } from '../../../utils/geoUtils';
import { getFeatureColor } from '../../../utils/mapUtils';

/**
 * State Boundary Layer with District Choropleth
 */
export const StateBoundaryLayer = ({
    data,
    filters,
    legendFeature,
    legendData,
    districtRainfall,
    onFiltersApply,
    onLocationClick,
    geoJsonRef
}) => {
    // Use a stable ref for filters to access latest state in event handlers without re-rendering
    const filtersRef = React.useRef(filters);
    React.useEffect(() => { filtersRef.current = filters; }, [filters]);

    // Filter data to only show the selected district if one is selected
    const filteredData = React.useMemo(() => {
        if (!data) return null;

        // If we are in Rainfall mode, we show the whole state with choropleth
        if (filters?.type === 'Rainfall') return data;

        // If no district is selected, return the whole state boundary data
        if (!filters?.district) return data;

        const features = data.features.filter(f => {
            const p = f.properties;
            const name = p.name || p.New_Dist || p.DIST_NAME || p.District || p.dist_name || p.district_name;
            return name?.toString().trim().toLowerCase() === filters.district.toString().trim().toLowerCase();
        });

        return { ...data, features };
    }, [data, filters?.district, filters?.type]);

    // Calculate a data hash to force re-render when values change (even if count stays same)
    const dataHash = React.useMemo(() => {
        if (!districtRainfall) return '0';
        const keys = Object.keys(districtRainfall);
        if (keys.length === 0) return '0';
        // Sum first 5 values as a simplified hash (sufficient for typical filter changes)
        return keys.slice(0, 5).reduce((acc, key) => acc + (districtRainfall[key] || 0), 0).toFixed(2);
    }, [districtRainfall]);

    if (!data) return null;

    return (
        <GeoJSON
            // Only re-mount if type changes, district filter changes, or DATA VALUES change
            key={`rajasthan-boundary-${filters?.type}-${filters?.district}-${Object.keys(districtRainfall || {}).length}-${dataHash}`}
            ref={geoJsonRef}
            data={filteredData}
            style={(feature) => {
                const isRainfall = filters?.type === 'Rainfall';
                let val;
                let computedColor = 'transparent';

                if (isRainfall) {
                    val = getFeatureProperty(feature, legendFeature);
                    computedColor = getFeatureColor(val, legendData);
                }

                return {
                    fillColor: isRainfall ? computedColor : 'transparent',
                    fillOpacity: isRainfall ? 0.75 : 0,
                    color: isRainfall ? '#475569' : '#1e293b', // Darker border for visibility (Slate 900)
                    weight: isRainfall ? 1 : 1.5,
                    dashArray: '',
                    fill: true
                };
            }}
            interactive={true} // Always interactive
            onEachFeature={(feature, layer) => {
                const dName = feature.properties.name || feature.properties.New_Dist || feature.properties.DIST_NAME || feature.properties.District || feature.properties.dist_name || feature.properties.district_name;
                const isRainfall = filters?.type === 'Rainfall';

                // Tooltips intentionally disabled — no hover labels shown

                layer.on({
                    click: e => {
                        // Update coordinate selection
                        if (onLocationClick) {
                            onLocationClick({ lat: e.latlng.lat, lng: e.latlng.lng }, [{
                                id: dName,
                                location: dName,
                                district: dName,
                                type: 'district'
                            }]);
                        }
                        // Update filters
                        if (onFiltersApply && dName) {
                            onFiltersApply({ ...filtersRef.current, district: dName });
                        }
                    }
                });
            }}
        />
    );
};

/**
 * District Highlight Layer
 */
export const DistrictHighlightLayer = ({ data, district, dimmed }) => {
    if (!data) return null;

    return (
        <GeoJSON
            key={`selected-dist-${district}-${dimmed}`}
            data={data}
            style={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#2563eb',
                weight: dimmed ? 1.5 : 4,
                opacity: dimmed ? 0.3 : 0.8
            }}
            interactive={false}
        />
    );
};
/**
 * Selection Highlight Layer (for selected GP or Village)
 */
export const SelectionHighlightLayer = ({ data, level }) => {
    if (!data) return null;

    // Handle both cases: a full GeoJSON object or just a geometry object
    const geojsonData = data.type && ['Feature', 'FeatureCollection', 'GeometryCollection'].includes(data.type)
        ? data
        : (data.coordinates ? { type: 'Feature', geometry: data, properties: {} } : null);

    if (!geojsonData) return null;

    const getLevelStyle = () => {
        switch (level) {
            case 'district': return { color: '#0ea5e9', weight: 4.0 };
            case 'block': return { color: '#059669', weight: 4.0 };
            case 'gp': return { color: '#d97706', weight: 3.0 };       // Amber
            case 'village': return { color: '#ea580c', weight: 2.0 };
            default: return { color: '#0ea5e9', weight: 3.0 };
        }
    };

    const layerStyle = getLevelStyle();

    return (
        <GeoJSON
            key={`highlight-${level}-${data.id || data.properties?.name || data.properties?.vllg_name || 'selected'}`}
            data={geojsonData}
            pane="selectionHighlightPane"
            style={{
                fillColor: layerStyle.color,
                fillOpacity: level === 'gp' ? 0.15 : 0.1, // Subtle fill
                color: layerStyle.color,
                weight: layerStyle.weight,
                opacity: 1,
                lineJoin: 'round',
                lineCap: 'round',
                dashArray: null
            }}
            interactive={false}
            onEachFeature={() => {
                // Tooltips intentionally disabled — no hover labels shown for selection outlines
            }}
        />
    );
};
