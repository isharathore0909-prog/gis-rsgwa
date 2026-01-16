import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
// Ensure leaflet.vectorgrid is imported
// Side-effect import to attach to L.vectorGrid
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.js';

/**
 * VectorGridSlicer Component
 * 
 * Renders large GeoJSON datasets using Leaflet.VectorGrid.Slicer.
 * This performs client-side vector tiling, avoiding the need for a backend tile server.
 * 
 * @param {string} dataUrl - Path to the GeoJSON file (e.g. /data/aquifer.json)
 * @param {object} style - Polygon styling
 * @param {boolean} active - Visibility toggle
 * @param {string} layerName - ID for the layer
 */
// Simple data cache to avoid re-fetching large JSONs multiple times
const dataCache = new Map();

const VectorGridSlicer = ({ dataUrl, style, active, layerName, filter, onFeatureClick }) => {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        const cleanupLayer = () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };

        if (!active || !dataUrl) {
            cleanupLayer();
            return;
        }

        let isActive = true;

        const renderData = (data) => {
            if (!isActive) return;

            // Apply Filtering if provided
            let filteredData = data;
            if (filter && filter.field && filter.value) {
                const filterVal = filter.value.toString().toUpperCase().trim();

                if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
                    filteredData = {
                        ...data,
                        features: data.features.filter(f => {
                            const val = f.properties[filter.field];
                            return val && val.toString().toUpperCase().trim() === filterVal;
                        })
                    };
                }
            }

            cleanupLayer();

            // VectorGrid Options
            const vectorGrid = L.vectorGrid.slicer(filteredData, {
                rendererFactory: L.svg.tile,
                vectorTileLayerStyles: {
                    sliced: style
                },
                zIndex: 400, // Ensure it's above the basemap tiles
                interactive: true,
                getFeatureId: (f) => f.properties.FID || f.properties.id || Math.random()
            });

            vectorGrid.on('click', (e) => {
                L.DomEvent.stopPropagation(e.originalEvent || e); // Ensure propagation stops

                console.log("Vector Feature Clicked:", e.layer.properties);

                if (onFeatureClick) {
                    onFeatureClick(e);
                    return;
                }

                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(
                        `<div style="max-height: 200px; overflow-y: auto; font-family: sans-serif; font-size: 13px;">
                            <h4 style="margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Layer Details (${layerName || 'Selection'})</h4>
                            <div style="background: #f8fafc; padding: 8px; border-radius: 4px;">
                                ${Object.entries(e.layer.properties).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('')}
                            </div>
                         </div>`
                    )
                    .openOn(map);
            });

            if (isActive) {
                vectorGrid.addTo(map);
                layerRef.current = vectorGrid;
            }
        };

        const fetchAndRender = async () => {
            try {
                if (dataCache.has(dataUrl)) {
                    renderData(dataCache.get(dataUrl));
                } else {
                    const response = await fetch(dataUrl);
                    if (!response.ok) throw new Error(`Failed to fetch ${dataUrl}`);
                    const data = await response.json();
                    dataCache.set(dataUrl, data);
                    renderData(data);
                }
            } catch (err) {
                console.error("Error loading VectorGrid data:", err);
            }
        };

        fetchAndRender();

        return () => {
            isActive = false;
            cleanupLayer();
        };
    }, [map, dataUrl, active, style, filter, layerName]);

    return null;
};

export default VectorGridSlicer;
