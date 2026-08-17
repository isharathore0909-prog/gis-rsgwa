import React from 'react';
import { WMSTileLayer } from 'react-leaflet';
import { getFeatureColor } from '../../../utils/mapUtils';
import { GEOSERVER_CONFIG } from '../../../api/config';

const selectionCql = (name, id, code) => {
    const escapedName = String(name || '').replace(/'/g, "''");
    const selectedCode = code ?? id;
    if (selectedCode != null && String(selectedCode).trim() !== '') {
        const escapedCode = String(selectedCode).replace(/'/g, "''");
        return /^\d+$/.test(escapedCode)
            ? `(id = ${escapedCode} OR code = '${escapedCode}')`
            : `code = '${escapedCode}'`;
    }
    return `name ILIKE '${escapedName}'`;
};

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
            url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
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
    const { district, block, gramPanchayat, village, districtId, blockId, gpId, vlgId, villageId, districtCode, blockCode, gpCode, vlgCode, villageCode } = filters || {};

    const districtHighlight = React.useMemo(() => {
        if (!district || block || gramPanchayat || village) return null;

        const cql = selectionCql(district, districtId, districtCode);

        // Blue outline for the selected district
        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_district</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#ff0000</CssParameter><CssParameter name="fill-opacity">0.1</CssParameter></Fill><Stroke><CssParameter name="stroke">#ff0000</CssParameter><CssParameter name="stroke-width">4.0</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql, sld };
    }, [district, districtId, districtCode, block, gramPanchayat, village]);

    const blockHighlight = React.useMemo(() => {
        if (!block || gramPanchayat || village) return null;

        const filterCql = selectionCql(block, blockId, blockCode);

        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_block</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#059669</CssParameter><CssParameter name="fill-opacity">0.12</CssParameter></Fill><Stroke><CssParameter name="stroke">#059669</CssParameter><CssParameter name="stroke-width">3.5</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql: filterCql, sld };
    }, [block, blockId, blockCode, gramPanchayat, village]);

    const gpHighlight = React.useMemo(() => {
        if (!gramPanchayat || village) return null;

        const cql = selectionCql(gramPanchayat, gpId, gpCode);

        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_grampanchayat</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#d97706</CssParameter><CssParameter name="fill-opacity">0.15</CssParameter></Fill><Stroke><CssParameter name="stroke">#d97706</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql, sld };
    }, [gramPanchayat, gpId, gpCode, village]);

    const villageHighlight = React.useMemo(() => {
        if (!village) return null;

        const cql = selectionCql(village, vlgId || villageId, vlgCode || villageCode);
        const sld = `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_village</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#7c3aed</CssParameter><CssParameter name="fill-opacity">0.18</CssParameter></Fill><Stroke><CssParameter name="stroke">#7c3aed</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

        return { cql, sld };
    }, [village, vlgId, villageId, vlgCode, villageCode]);

    return (
        <>
            {/* District highlight — blue outline */}
            {districtHighlight && (
                <WMSTileLayer
                    key={`sel-dist-${district}`}
                    url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
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
                    url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
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
                    url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
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

            {/* Village highlight — violet outline */}
            {villageHighlight && (
                <WMSTileLayer
                    key={`sel-village-${village}`}
                    url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
                    layers="rgwcma:locationApi_village"
                    format="image/png"
                    transparent={true}
                    zIndex={680}
                    params={{
                        sld_body: villageHighlight.sld,
                        cql_filter: villageHighlight.cql
                    }}
                />
            )}
        </>
    );
};
