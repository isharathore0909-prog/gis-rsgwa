import React from 'react';
import { GeoJSON } from 'react-leaflet';
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
    geoJsonRef
}) => {
    if (!data) return null;

    return (
        <GeoJSON
            key={`rajasthan-boundary-${filters?.type}-${filters?.district || 'state'}-${filters?.block || 'all'}-${filters?.gramPanchayat || 'all'}-${filters?.village || 'all'}-${Object.keys(districtRainfall || {}).length}`}
            ref={geoJsonRef}
            data={data}
            style={(feature) => {
                const isRainfall = filters?.type === 'Rainfall';
                let val;
                if (isRainfall) {
                    val = getFeatureProperty(feature, legendFeature);
                }
                return {
                    fillColor: isRainfall ? getFeatureColor(val, legendData) : '#64748b',
                    fillOpacity: isRainfall ? 0.75 : 0.05,
                    color: isRainfall ? '#475569' : '#1e293b',
                    weight: isRainfall ? 1 : 2,
                    dashArray: isRainfall ? '' : '5, 5'
                };
            }}
            interactive={filters?.type === 'Rainfall'}
            onEachFeature={(feature, layer) => {
                if (filters?.type === 'Rainfall') {
                    const val = getFeatureProperty(feature, legendFeature);
                    const displayVal = (val !== null && val !== undefined)
                        ? `${Number(val).toFixed(1)} mm`
                        : 'No Data';

                    // Bind tooltip once
                    layer.bindTooltip(`
                        <div style="font-weight:bold">${feature.properties.New_Dist || feature.properties.DIST_NAME || feature.properties.District}</div>
                        <div>${displayVal}</div>
                    `, { sticky: true, className: 'custom-map-tooltip' });

                    layer.on({
                        mouseover: e => {
                            const l = e.target;
                            l.setStyle({ weight: 2.5, color: '#475569', fillOpacity: 0.9 });
                            l.bringToFront();
                        },
                        mouseout: e => {
                            geoJsonRef.current?.resetStyle(e.target);
                        },
                        click: e => {
                            const dName = feature.properties.New_Dist || feature.properties.DIST_NAME || feature.properties.District;
                            onFiltersApply({ ...filters, district: dName });
                        }
                    });
                }
            }}
        />
    );
};

/**
 * District Highlight Layer
 */
export const DistrictHighlightLayer = ({ data, district }) => {
    if (!data) return null;

    return (
        <GeoJSON
            key={`selected-dist-${district}`}
            data={data}
            style={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#2563eb',
                weight: 4,
                opacity: 0.8
            }}
            interactive={false}
        />
    );
};
