import React, { useEffect, useMemo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
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
    canalData,
    waterbodyData,
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

    if (!isActive) return null;

    return (
        <>
            {showCanals && (
                <VectorGridSlicer
                    key={`canals-${layerColors.canals}-${canalData?.features?.length || 0}`}
                    active={true}
                    data={canalData}
                    layerName="canals"
                    filter={canalFilter}
                    style={canalStyle}
                    onLoading={onLoading}
                />
            )}
            {showWaterbodies && (
                <VectorGridSlicer
                    key={`waterbodies-${layerColors.waterbodies}-${waterbodyData?.features?.length || 0}`}
                    active={true}
                    data={waterbodyData}
                    layerName="waterbodies"
                    filter={waterbodyFilter}
                    style={waterbodyStyle}
                    onLoading={onLoading}
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
