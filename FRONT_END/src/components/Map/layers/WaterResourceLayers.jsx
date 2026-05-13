import React, { useEffect, useMemo } from 'react';
import { GEOSERVER_CONFIG } from '../../../api/config';
import { GeoJSON, WMSTileLayer, useMap } from 'react-leaflet';
import VectorGridSlicer from '../VectorGridSlicer';
import { DamMarker, RechargeMarker } from '../Markers';

export const DamMarkersLayer = ({
    isActive,
    damMarkers,
    onDamClick,
    onAddToTable,
    color
}) => {
    if (!isActive || !damMarkers.length) return null;

    return (
        <>
            {damMarkers.map((dam, idx) => (
                <DamMarker
                    key={`${dam.name}-${idx}`}
                    dam={dam}
                    coordinate={dam.coordinate}
                    onDamClick={onDamClick}
                    onAddToTable={onAddToTable}
                    color={color}
                />
            ))}
        </>
    );
};

export const RechargeMarkersLayer = ({
    isActive,
    rechargeRecords,
    onStructureClick,
    color
}) => {
    if (!isActive || !rechargeRecords?.length) return null;

    return (
        <>
            {rechargeRecords.map((item, idx) => (
                <RechargeMarker
                    key={`${item.id || idx}`}
                    structure={item}
                    coordinate={{ lat: item.latitude || item.lat, lng: item.longitude || item.lng }}
                    onStructureClick={onStructureClick}
                    color={color}
                />
            ))}
        </>
    );
};

export const WaterResourcesLayers = ({
    isActive,
    showCanals,
    showWaterbodies,
    showMicro,
    showRecharge,
    canalFilter,
    waterbodyFilter,
    microData,
    rechargeRecords,
    onStructureClick,
    layerColors = { canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722", recharge: "#22c55e" },
    onLoading
}) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        const handleDragStart = () => {
            if (typeof map.closeTooltip === 'function') {
                try {
                    map.closeTooltip();
                } catch (e) {
                }
            }
        };
        map.on('dragstart', handleDragStart);
        return () => map.off('dragstart', handleDragStart);
    }, [map]);

    const canalStyle = useMemo(() => ({
        color: layerColors.canals,
        weight: 2.5,
        opacity: 1
    }), [layerColors.canals]);

    const waterbodyStyle = useMemo(() => ({
        fillColor: layerColors.waterbodies,
        fillOpacity: 0.7,
        color: layerColors.waterbodies,
        weight: 1.5
    }), [layerColors.waterbodies]);

    const microStyle = useMemo(() => ({
        color: layerColors.micro,
        weight: 1,
        fillOpacity: 0.6
    }), [layerColors.micro]);

    const getCqlFilter = (filter, isLayerWithJsonProperties = true) => {
        let clauses = [];

        if (!isLayerWithJsonProperties) {
            // Standard column-based filtering for newer layers like Recharge Structures
            if (filter?.villageId) clauses.push(`village_id = ${filter.villageId}`);
            else if (filter?.gpId) clauses.push(`gp_id = ${filter.gpId}`);
            else if (filter?.blockId) clauses.push(`block_id = ${filter.blockId}`);
            else if (filter?.districtId) clauses.push(`district_id = ${filter.districtId}`);
            return clauses.length ? clauses.join(' AND ') : null;
        }

        const makeRegex = (key, val, isNumeric = false) => {
            if (!val) return null;
            const escapeVal = val.toString().replace(/['"\\.*+?^${}()|[\]\\]/g, '\\$&');
            if (isNumeric) {
                return `strMatches(properties, '(?i).*"${key}"\\s*:\\s*${escapeVal}\\b.*') = true`;
            }
            return `strMatches(properties, '(?i).*"${key}"\\s*:\\s*"[^"]*${escapeVal}[^"]*".*') = true`;
        };

        if (filter?.village) {
            clauses.push(makeRegex('VILLAGE_NM', filter.village));
        } else if (filter?.gpId || filter?.gramPanchayat) {
            // Prioritize string names for better matching
            if (filter?.gramPanchayat) {
                clauses.push(makeRegex('GP_FINAL', filter.gramPanchayat));
            } else if (filter?.gpId) {
                clauses.push(makeRegex('GP_FINAL_C', filter.gpId, true));
            }
        } else if (filter?.blockCode || filter?.block) {
            if (filter?.block) {
                clauses.push(makeRegex('BLOCK_NAME_2', filter.block));
            } else if (filter?.blockCode) {
                clauses.push(makeRegex('BLOCK_CODE_2', filter.blockCode, true));
            }
        } else if (filter?.districtCode || filter?.district) {
            if (filter?.district) {
                clauses.push(makeRegex('DISTRICT_N_2', filter.district));
            } else if (filter?.districtCode) {
                clauses.push(makeRegex('district_code', filter.districtCode, true));
            }
        }

        return clauses.length ? clauses.join(' AND ') : null;
    };

    const canalSld = useMemo(() => {
        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>canals_layer</Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">${layerColors.canals}</CssParameter><CssParameter name="stroke-width">2.5</CssParameter></Stroke></LineSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
    }, [layerColors.canals]);

    const waterbodySld = useMemo(() => {
        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>waterbodies_layer</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">${layerColors.waterbodies}</CssParameter><CssParameter name="fill-opacity">0.7</CssParameter></Fill><Stroke><CssParameter name="stroke">${layerColors.waterbodies}</CssParameter><CssParameter name="stroke-width">1.0</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
    }, [layerColors.waterbodies]);

    const rechargeSld = useMemo(() => {
        const color = layerColors.recharge || '#22c55e';
        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>recharge_structure_layer</Name><UserStyle><FeatureTypeStyle><Rule><PointSymbolizer><Graphic><Mark><WellKnownName>triangle</WellKnownName><Fill><CssParameter name="fill">${color}</CssParameter></Fill><Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">1.5</CssParameter></Stroke></Mark><Size>16</Size><Rotation>180</Rotation></Graphic></PointSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
    }, [layerColors.recharge]);

    if (!isActive) return null;

    const canalFilterCql = getCqlFilter(canalFilter);
    const waterbodyFilterCql = getCqlFilter(waterbodyFilter);
    const rechargeFilterCql = getCqlFilter(canalFilter, false);

    return (
        <>
            {showCanals && (
                <WMSTileLayer
                    key={`canals-v3-${canalFilter?.districtId}-${canalFilter?.blockId}`}
                    url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
                    layers="rgwcma:canals_layer"
                    format="image/png"
                    transparent={true}
                    zIndex={501}
                    params={{
                        ...(canalFilterCql ? { cql_filter: canalFilterCql } : {}),
                        sld_body: canalSld,
                        version: '1.1.1'
                    }}
                />
            )}
            {showWaterbodies && (
                <WMSTileLayer
                    key={`waterbodies-v3-${waterbodyFilter?.districtId}-${waterbodyFilter?.blockId}`}
                    url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
                    layers="rgwcma:waterbodies_layer"
                    format="image/png"
                    transparent={true}
                    zIndex={502}
                    params={{
                        ...(waterbodyFilterCql ? { cql_filter: waterbodyFilterCql } : {}),
                        sld_body: waterbodySld,
                        version: '1.1.1'
                    }}
                />
            )}
            {showRecharge && (
                <>
                    <WMSTileLayer
                        key={`recharge-wms-${canalFilter?.districtId}-${canalFilter?.blockId}`}
                        url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
                        layers="rgwcma:recharge_structure_layer"
                        format="image/png"
                        transparent={true}
                        zIndex={503}
                        params={{
                            ...(rechargeFilterCql ? { cql_filter: rechargeFilterCql } : {}),
                            sld_body: rechargeSld,
                            version: '1.1.1'
                        }}
                    />
                    <RechargeMarkersLayer
                        isActive={true}
                        rechargeRecords={rechargeRecords}
                        onStructureClick={onStructureClick}
                        color={layerColors.recharge}
                    />
                </>
            )}
            {showMicro && microData && (
                <GeoJSON
                    key={`micro-layer-${microData.features?.length || 0}-${layerColors.micro}`}
                    data={microData}
                    style={microStyle}
                    onEachFeature={(feature, layer) => {
                        const props = feature.properties;
                        layer.bindTooltip(`
                            <div style="font-weight:bold">Micro Structure</div>
                            ${props.MICRO_ID ? `<div>Micro ID: ${props.MICRO_ID}</div>` : ''}
                            ${props.MACRO_NAME ? `<div>Macro: ${props.MACRO_NAME}</div>` : ''}
                            ${props.DIVISION ? `<div>Division: ${props.DIVISION}</div>` : ''}
                        `, { sticky: false });
                    }}
                />
            )}
        </>
    );
};
