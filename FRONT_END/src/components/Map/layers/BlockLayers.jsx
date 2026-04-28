import React, { useMemo } from 'react';
import { WMSTileLayer } from 'react-leaflet';

export const BlockBoundaryLayer = ({
    filters,
    legendData,
    blockData
}) => {
    // Generate CQL filter with support for multiple common field names in Geoserver layers
    const cqlFilterParam = useMemo(() => {
        const bid = filters.blockId || filters.blockCode;
        const did = filters.districtId;

        if (bid) {
            return `id = ${bid} OR code = '${bid}' OR name ILIKE '${filters.block?.replace("'", "''")}'`;
        }
        if (did) {
            return `district_id = ${did}`;
        }
        return '1=0';
    }, [filters.districtId, filters.blockId, filters.blockCode, filters.block]);

    const sldBody = useMemo(() => {
        // Standard outline style for blocks
        const strokeColor = "#64748b";
        const strokeWidth = 0.8;

        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>rgwcma:locationApi_block</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Stroke><CssParameter name="stroke">${strokeColor}</CssParameter><CssParameter name="stroke-width">${strokeWidth}</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`.replace(/>\s+</g, '><');
    }, []);

    // Hide block boundary when an individual GP is selected to focus strictly on the GP level
    if (filters.gramPanchayat) return null;

    return (
        <WMSTileLayer
            key={`block-wms-${filters.district}-${filters.block}-${filters.type}`}
            url="http://localhost:8080/geoserver/rgwcma/wms"
            layers="rgwcma:locationApi_block"
            format="image/png"
            transparent={true}
            zIndex={410}
            params={{
                sld_body: sldBody,
                version: '1.1.1',
                ...(cqlFilterParam ? { cql_filter: cqlFilterParam } : {})
            }}
        />
    );
};

/**
 * Drill-down Boundaries Layer (GP, Village)
 * Renders hierarchical boundaries below the Block level using the SQL view in Geoserver.
 */
export const DrillDownBoundariesLayer = ({ filters }) => {
    // 1. GP Layer Config (Show GPs in the selected Block)
    const gpConfig = useMemo(() => {
        if (!filters.block) return null;

        const bid = filters.blockId || filters.block_id || -1;
        const gpid = filters.gpId || filters.gp_id || -1;

        let filter;
        if (gpid !== -1) {
            // If a GP is selected, show only that GP
            filter = `id = ${gpid}`;
        } else if (bid !== -1) {
            // If only a block is selected, show all GPs in that block
            filter = `block_id = ${bid}`;
        } else {
            filter = `block_id = -1`;
        }

        return {
            layer: "rgwcma:locationApi_grampanchayat",
            filter: filter,
            color: '#ff0000',
            weight: '2.0'
        };
    }, [filters.block, filters.blockId, filters.block_id, filters.gpId, filters.gp_id]);

    // 2. Village Layer Config (Show Villages inside the selected GP)
    const villageConfig = useMemo(() => {
        if (!filters.gramPanchayat) return null;

        const gpid = filters.gpId || filters.gp_id || filters.gpCode || filters.gp_code || -1;
        let filter = gpid !== -1 ? `grampanchayat_id = ${gpid}` : `grampanchayat_id = -1`;

        return {
            layer: "rgwcma:locationApi_village",
            filter: filter,
            color: '#ff0000',
            weight: '2.0'
        };
    }, [filters.gramPanchayat, filters.gpId, filters.gp_id, filters.gpCode, filters.gp_code]);

    // Helper to generate SLD dynamically
    const generateSld = (color, weight, layerName) => {
        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>${layerName}</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Stroke><CssParameter name="stroke">${color}</CssParameter><CssParameter name="stroke-width">${weight}</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`.replace(/>\s+</g, '><');
    };

    return (
        <React.Fragment>
            {/* Render GPs in the Block */}
            {gpConfig && (
                <WMSTileLayer
                    key={`drill-gp-${gpConfig.layer}-${filters.block}`}
                    url="http://localhost:8080/geoserver/rgwcma/wms"
                    layers={gpConfig.layer}
                    format="image/png"
                    transparent={true}
                    zIndex={415}
                    params={{
                        sld_body: generateSld(gpConfig.color, gpConfig.weight, gpConfig.layer),
                        cql_filter: gpConfig.filter
                    }}
                />
            )}

            {/* Render Villages in the GP */}
            {villageConfig && (
                <WMSTileLayer
                    key={`drill-vill-${villageConfig.layer}-${filters.gramPanchayat}`}
                    url="http://localhost:8080/geoserver/rgwcma/wms"
                    layers={villageConfig.layer}
                    format="image/png"
                    transparent={true}
                    zIndex={420}
                    params={{
                        sld_body: generateSld(villageConfig.color, villageConfig.weight, villageConfig.layer),
                        cql_filter: villageConfig.filter
                    }}
                />
            )}
        </React.Fragment>
    );
};

