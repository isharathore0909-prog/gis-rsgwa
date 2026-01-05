import React from 'react';
import { Polyline, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { getRiverPathForBasin } from '../../data/riverPaths';

const BasinFlowOverlay = ({ dam, coordinate }) => {
    if (!dam || !coordinate) return null;

    const getBasinFlowDirection = (basin) => {
        const basinDirections = {
            'Ganga': { direction: 'Northeast', color: '#10b981', angle: 45, distance: 0.6, description: 'Ban Ganga - Flows via Chambal-Yamuna to Bay of Bengal' },
            'Mahi': { direction: 'Southwest', color: '#3b82f6', angle: 225, distance: 0.5, description: 'Flows to Gulf of Khambhat, Arabian Sea' },
            'West flowing rivers of Kutch and Saurashtra including Luni': { direction: 'Southwest', color: '#f59e0b', angle: 240, distance: 0.55, description: 'Flows to Rann of Kutch (inland drainage)' },
            'Sabarmati': { direction: 'Southwest', color: '#8b5cf6', angle: 220, distance: 0.5, description: 'Flows to Gulf of Khambhat, Arabian Sea' },
            'Area of inland drainage of Rajasthan': { direction: 'Inland (No Outlet)', color: '#6b7280', angle: 0, distance: 0.25, description: 'Terminates in landlocked areas' }
        };
        return basinDirections[basin] || { direction: 'Unknown', color: '#94a3b8', angle: 90, distance: 0.3, description: 'Flow direction not mapped' };
    };

    const flowInfo = getBasinFlowDirection(dam.basin);
    const riverPath = getRiverPathForBasin(dam.basin);
    const mainFlowPath = riverPath.length > 1 ? riverPath : [
        [coordinate.lat, coordinate.lng],
        [coordinate.lat + (0.5 * Math.cos((flowInfo.angle * Math.PI) / 180)),
        coordinate.lng + (0.5 * Math.sin((flowInfo.angle * Math.PI) / 180))]
    ];

    const endPoint = mainFlowPath[mainFlowPath.length - 1];
    let damPositionIndex = 0;
    let minDistance = Infinity;

    mainFlowPath.forEach((point, index) => {
        const distance = Math.sqrt(Math.pow(point[0] - coordinate.lat, 2) + Math.pow(point[1] - coordinate.lng, 2));
        if (distance < minDistance) {
            minDistance = distance;
            damPositionIndex = index;
        }
    });

    const arrowIcon = L.divIcon({
        className: 'flow-arrow-marker',
        html: `
            <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(${flowInfo.angle}deg);">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>
                <path d="M 20 5 L 20 25 L 15 20 M 20 25 L 25 20" stroke="${flowInfo.color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">
                    <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
                </path>
            </svg>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    return (
        <>
            <Polyline
                positions={mainFlowPath}
                pathOptions={{
                    color: flowInfo.color,
                    weight: 5,
                    opacity: 0.8,
                    dashArray: '12, 8',
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'animated-flow-line'
                }}
            />
            <Marker
                position={endPoint}
                icon={arrowIcon}
            />
            {damPositionIndex > 0 && (
                <Circle
                    center={mainFlowPath[damPositionIndex]}
                    radius={3000}
                    pathOptions={{ color: flowInfo.color, fillColor: flowInfo.color, fillOpacity: 0.3, weight: 2 }}
                />
            )}
            <Marker
                position={[coordinate.lat - 0.05, coordinate.lng]}
                icon={L.divIcon({
                    className: 'basin-info-label',
                    html: `
                        <div style="background: white; padding: 6px 12px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 2px solid ${flowInfo.color}; font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; text-align: center;">
                            <div style="color: ${flowInfo.color}; font-size: 13px; margin-bottom: 2px;">${flowInfo.direction}</div>
                            <div style="font-size: 9px; color: #64748b;">${dam.basin}</div>
                        </div>
                    `,
                    iconSize: [120, 40],
                    iconAnchor: [60, 40]
                })}
            />
        </>
    );
};

export default BasinFlowOverlay;
