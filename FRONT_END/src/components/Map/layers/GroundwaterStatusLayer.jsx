import React, { useMemo } from 'react';
import { WMSTileLayer } from 'react-leaflet';
import { GEOSERVER_CONFIG } from '../../../api/config';

/**
 * GroundwaterStatusLayer component
 * Renders the Ground Water Resource Estimation (GWRE) status thematic layer
 * using GeoServer WMS.
 */
export const GroundwaterStatusLayer = ({
    isActive,
    filters
}) => {
    const handleFilters = () => {
        const bid = filters.blockId || filters.blockCode;
        const did = filters.districtId || filters.districtCode;

        if (bid) {
            return `block_code = '${bid}' OR name ILIKE '${filters.block?.replace("'", "''")}'`;
        }
        if (did) {
            return `district_code = '${did}' OR district_name ILIKE '${filters.district?.replace("'", "''")}'`;
        }

        return null;
    };

    const sldBody = useMemo(() => {
        const colors = {
            'safe': '#22c55e',          // green-500
            'semi-critical': '#eab308', // yellow-500
            'critical': '#f97316',      // orange-500
            'over-exploited': '#ef4444',// red-500
            'saline': '#64748b'         // slate-500
        };

        let rules = '';
        Object.entries(colors).forEach(([cat, color]) => {
            rules += `
            <Rule>
                <Name>${cat}</Name>
                <Title>${cat}</Title>
                <ogc:Filter>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>category</ogc:PropertyName>
                        <ogc:Literal>${cat}</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Filter>
                <PolygonSymbolizer>
                    <Fill><CssParameter name="fill">${color}</CssParameter></Fill>
                    <Stroke>
                        <CssParameter name="stroke">#ffffff</CssParameter>
                        <CssParameter name="stroke-width">1</CssParameter>
                    </Stroke>
                </PolygonSymbolizer>
            </Rule>`;
        });

        // Add a fallback rule for unknown geometries so it's never fully invisible
        rules += `
        <Rule>
            <ElseFilter/>
            <PolygonSymbolizer>
                <Fill><CssParameter name="fill">#cbd5e1</CssParameter></Fill>
                <Stroke><CssParameter name="stroke">#94a3b8</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke>
            </PolygonSymbolizer>
        </Rule>`;

        return `<?xml version="1.0" encoding="UTF-8"?>
        <StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc">
            <NamedLayer>
                <Name>rgwcma:groundwater_status_layer</Name>
                <UserStyle>
                    <FeatureTypeStyle>
                        ${rules}
                    </FeatureTypeStyle>
                </UserStyle>
            </NamedLayer>
        </StyledLayerDescriptor>`.replace(/>\s+</g, '><');
    }, []);

    const cqlFilter = handleFilters();
    const baseUrl = `${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`;
    const layerName = "rgwcma:groundwater_status_layer";

    if (!isActive) return null;

    return (
        <WMSTileLayer
            key={`gw-status-wms-${cqlFilter || 'all'}`}
            url={baseUrl}
            layers={layerName}
            format="image/png"
            transparent={true}
            zIndex={1000}
            params={{
                ...(cqlFilter ? { cql_filter: cqlFilter } : {}),
                sld_body: sldBody,
                version: '1.1.1'
            }}
        />
    );
};
