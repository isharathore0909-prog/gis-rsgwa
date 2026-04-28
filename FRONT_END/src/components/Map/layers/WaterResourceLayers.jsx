import React, { useEffect, useMemo } from 'react';
import { GeoJSON, WMSTileLayer, useMap } from 'react-leaflet';
import VectorGridSlicer from '../VectorGridSlicer';
import { DamMarker } from '../Markers';

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

export const WaterResourcesLayers = ({
    isActive,
    showCanals,
    showWaterbodies,
    showMicro,
    canalFilter,
    waterbodyFilter,
    microData,
    layerColors = { canals: "#00bcd4", waterbodies: "#0288d1", micro: "#ff5722" },
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

    const getCqlFilter = (filter) => {
        let clauses = [];

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

    if (!isActive) return null;

    const canalFilterCql = getCqlFilter(canalFilter);
    const waterbodyFilterCql = getCqlFilter(waterbodyFilter);

    return (
        <>
            {showCanals && (
                <WMSTileLayer
                    key={`canals-v3-${canalFilter?.districtId}-${canalFilter?.blockId}`}
                    url="http://localhost:8080/geoserver/rgwcma/wms"
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
                    url="http://localhost:8080/geoserver/rgwcma/wms"
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
