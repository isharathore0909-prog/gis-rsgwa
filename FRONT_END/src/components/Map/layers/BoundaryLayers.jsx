import React from 'react';
import { WMSTileLayer } from 'react-leaflet';
import { getFeatureColor } from '../../../utils/mapUtils';

/**
 * State Boundary Layer using WMS for Districts
 */
export const StateBoundaryLayer = ({
    filters,
    legendFeature,
    legendData,
    districtRainfall,
    isBackground = false
}) => {
    // Generate SLD for thematic district coloring (e.g. Rainfall)
    const sldBody = React.useMemo(() => {
        // If background mode, we just want thin gray outlines
        if (isBackground) {
            return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_district</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Stroke><CssParameter name="stroke">#94a3b8</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
        }

        return null;
    }, [isBackground]);

    const cql = React.useMemo(() => {
        if (filters?.districtId) {
            return `id = ${filters.districtId}`;
        }
        if (filters?.district) {
            return `name ILIKE '${filters.district.replace("'", "''")}'`;
        }

        return null; // Return all districts if none is specifically selected
    }, [filters?.district, filters?.districtId]);

    return (
        <WMSTileLayer
            key={`state-wms-${filters?.type}-${isBackground}-${filters?.district}`}
            url="http://localhost:8080/geoserver/rgwcma/wms"
            layers="rgwcma:locationApi_district"
            format="image/png"
            transparent={true}
            zIndex={isBackground ? 390 : 400}
            params={{
                ...(sldBody ? { sld_body: sldBody } : {}),
                ...(cql ? { cql_filter: `(${cql})` } : {})
            }}
        />
    );
};

/**
 * WMS Selection Highlight Layer
 *
 * Renders a coloured outline around the selected administrative unit
 * (district, block, GP) entirely via GeoServer WMS + CQL + SLD.
 * No GeoJSON is fetched from the database.
 */
export const WmsSelectionHighlight = ({ filters }) => {
    const { district, block, gramPanchayat, districtId, blockId, gpId } = filters || {};

    const districtHighlight = React.useMemo(() => {
        if (!district || block) return null;

        const cql = districtId
            ? `id = ${districtId}`
            : `name ILIKE '${district.replace("'", "''")}'`;

        // Blue outline for the selected district
        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_district</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#ff0000</CssParameter><CssParameter name="fill-opacity">0.1</CssParameter></Fill><Stroke><CssParameter name="stroke">#ff0000</CssParameter><CssParameter name="stroke-width">4.0</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql, sld };
    }, [district, districtId, block]);

    const blockHighlight = React.useMemo(() => {
        if (!block || gramPanchayat) return null;

        const cqlParts = [];
        if (districtId) cqlParts.push(`district_id = ${districtId}`);
        if (blockId) {
            cqlParts.push(`id = ${blockId} OR code = '${blockId}'`);
        } else if (block) {
            cqlParts.push(`name ILIKE '${block.replace("'", "''")}'`);
        }
        const filterCql = cqlParts.length > 0 ? cqlParts.join(' AND ') : '1=1';

        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_block</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#059669</CssParameter><CssParameter name="fill-opacity">0.12</CssParameter></Fill><Stroke><CssParameter name="stroke">#059669</CssParameter><CssParameter name="stroke-width">3.5</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql: filterCql, sld };
    }, [district, districtId, block, blockId, gramPanchayat]);

    const gpHighlight = React.useMemo(() => {
        if (!block || !gramPanchayat) return null;

        const gpid = gpId || filters.gpCode || filters.gp_id;
        const cqlParts = [];
        if (blockId) cqlParts.push(`block_id = ${blockId}`);
        if (gpid) {
            cqlParts.push(`(id = ${gpid} OR code = '${gpid}')`);
        } else if (gramPanchayat) {
            cqlParts.push(`name ILIKE '${gramPanchayat.replace("'", "''")}'`);
        }
        const cql = cqlParts.length > 0 ? cqlParts.join(' AND ') : '1=1';

        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_grampanchayat</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#d97706</CssParameter><CssParameter name="fill-opacity">0.15</CssParameter></Fill><Stroke><CssParameter name="stroke">#d97706</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql, sld };
    }, [block, gramPanchayat, gpId]);

    return (
        <>
            {/* District highlight — blue outline */}
            {districtHighlight && (
                <WMSTileLayer
                    key={`sel-dist-${district}`}
                    url="http://localhost:8080/geoserver/rgwcma/wms"
                    layers="rgwcma:locationApi_district"
                    format="image/png"
                    transparent={true}
                    zIndex={650}
                    params={{
                        sld_body: districtHighlight.sld,
                        cql_filter: districtHighlight.cql
                    }}
                />
            )}

            {/* Block highlight — green outline */}
            {blockHighlight && (
                <WMSTileLayer
                    key={`sel-block-${district}-${block}`}
                    url="http://localhost:8080/geoserver/rgwcma/wms"
                    layers="rgwcma:locationApi_block"
                    format="image/png"
                    transparent={true}
                    zIndex={660}
                    params={{
                        sld_body: blockHighlight.sld,
                        cql_filter: blockHighlight.cql
                    }}
                />
            )}

            {/* GP highlight — amber outline */}
            {gpHighlight && (
                <WMSTileLayer
                    key={`sel-gp-${block}-${gramPanchayat}`}
                    url="http://localhost:8080/geoserver/rgwcma/wms"
                    layers="rgwcma:locationApi_grampanchayat"
                    format="image/png"
                    transparent={true}
                    zIndex={670}
                    params={{
                        sld_body: gpHighlight.sld,
                        cql_filter: gpHighlight.cql
                    }}
                />
            )}
        </>
    );
};
