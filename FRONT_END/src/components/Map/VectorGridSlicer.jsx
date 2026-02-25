import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { BACKEND_API } from '../../api/config';
import { resolveAquiferDistrict } from '../../constants/districtAliases';
// Ensure leaflet.vectorgrid is imported
// Side-effect import to attach to L.vectorGrid
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.js';

/**
 * VectorGridSlicer Component
 *
 * Renders large GeoJSON datasets using Leaflet.VectorGrid.Slicer.
 * Supports district filtering with alias resolution (new Rajasthan districts)
 * and spatial bounding-box overlap fallback via /district.geojson.
 */
const dataCache = new Map();

// ─── Geometry helpers ────────────────────────────────────────────────────────
function computeBbox(feature) {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    function walk(coords) {
        if (!Array.isArray(coords)) return;
        if (typeof coords[0] === 'number') {
            const [lon, lat] = coords;
            if (lon < minLon) minLon = lon;
            if (lat < minLat) minLat = lat;
            if (lon > maxLon) maxLon = lon;
            if (lat > maxLat) maxLat = lat;
        } else { coords.forEach(walk); }
    }
    walk(feature?.geometry?.coordinates);
    return [minLon, minLat, maxLon, maxLat];
}
function bboxOverlap(a, b) {
    if (!a || !b) return false;
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
// ─────────────────────────────────────────────────────────────────────────────

const VectorGridSlicer = ({ data, dataUrl, style, active, layerName, filter, onFeatureClick, onLoading }) => {
    const map = useMap();
    const layerRef = useRef(null);
    const debounceTimerRef = useRef(null);

    useEffect(() => {
        const cleanupLayer = () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };

        if (!active || (!dataUrl && !data)) {
            cleanupLayer();
            return;
        }

        let isActive = true;

        const renderData = (geoData) => {
            if (!isActive || !geoData) return;

            // If no data to show after filtering, just cleanup and stop
            if (!geoData || !geoData.features || geoData.features.length === 0) {
                cleanupLayer();
                if (onLoading) onLoading(false);
                return;
            }

            // Cleanup old layer before starting heavy slicing
            cleanupLayer();

            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                if (!isActive) return;
                try {
                    const vectorGrid = L.vectorGrid.slicer(geoData, {
                        rendererFactory: L.canvas.tile,
                        vectorTileLayerStyles: {
                            sliced: (properties) => {
                                const baseStyle = typeof style === 'function' ? style(properties) : style;
                                return {
                                    ...baseStyle,
                                    stroke: true,
                                    fill: !!(baseStyle.fillColor || baseStyle.fill)
                                };
                            }
                        },
                        zIndex: 800,
                        interactive: true,
                        maxZoom: 18,
                        indexMaxZoom: 8,
                        tolerance: 0.1,
                        getFeatureId: (f) => {
                            const p = f.properties;
                            return p.FID || p.id || p.OBJECTID || p.BLOCK_NAME || Math.random();
                        }
                    });

                    vectorGrid.on('click', (e) => {
                        L.DomEvent.stopPropagation(e.originalEvent || e);
                        if (onFeatureClick) {
                            onFeatureClick(e);
                        } else {
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
                        }
                    });

                    if (isActive) {
                        vectorGrid.addTo(map);
                        layerRef.current = vectorGrid;
                    }
                } catch (err) {
                    console.error("Slicing failed:", err);
                } finally {
                    if (onLoading) onLoading(false);
                }
            }, 150);
        };

        /**
         * Apply district filter to geoData.
         * Strategy:
         *  1. Name-based filter using New_Dist (+ alias resolution for new districts)
         *  2. Spatial bbox overlap using /district.geojson when name filter finds nothing
         */
        const applyDistrictFilter = async (geoData) => {
            if (!filter || !filter.field || !filter.value) return geoData;
            if (!geoData.features || !Array.isArray(geoData.features)) return geoData;

            const primaryField = filter.field;
            const blockVal = filter.block?.toString().toUpperCase().trim();

            // ── Pass 1: name-based filter ────────────────────────────────────
            const resolvedFilterVal = (primaryField === 'New_Dist' || primaryField === 'DIST_NAME')
                ? resolveAquiferDistrict(filter.value)
                : filter.value.toString().toUpperCase().trim();

            const applyBlockFilter = (features) => {
                if (!blockVal) return features;
                return features.filter(f => {
                    const p = f.properties;
                    const bVal = p.BLOCK_NAME || p.Block || p.BLOCK || p.block_name || p.taluka;
                    return bVal ? bVal.toString().toUpperCase().trim() === blockVal : true;
                });
            };

            const nameMatches = geoData.features.filter(f => {
                const props = f.properties;
                const distVal = props[primaryField] || props.DIST_NAME || props.District
                    || props.DISTRICT || props.district || props.DIST_N;
                return distVal && distVal.toString().toUpperCase().trim() === resolvedFilterVal;
            });

            if (nameMatches.length > 0) {
                return { ...geoData, features: applyBlockFilter(nameMatches) };
            }

            // ── Pass 2: spatial bbox overlap fallback ────────────────────────
            try {
                const distGeoJSON = dataCache.get('__district__') ||
                    await fetch('/district.geojson').then(r => r.ok ? r.json() : null);
                if (distGeoJSON) dataCache.set('__district__', distGeoJSON);

                const distNameUpper = filter.value.toString().toUpperCase().trim();
                const distFeature = distGeoJSON?.features?.find(f => {
                    const n = (f.properties?.New_Dist || '').toString().toUpperCase().trim();
                    return n === distNameUpper || n === resolvedFilterVal;
                });

                if (distFeature) {
                    const distBbox = computeBbox(distFeature);
                    const bboxMatches = geoData.features.filter(f => bboxOverlap(computeBbox(f), distBbox));
                    return { ...geoData, features: applyBlockFilter(bboxMatches) };
                }
            } catch (e) {
                console.warn('[VectorGridSlicer] Spatial bbox fallback failed:', e);
            }

            // Nothing found — return empty so the layer clears
            return { ...geoData, features: [] };
        };

        const fetchAndRender = async () => {
            if (onLoading) onLoading(true);
            try {
                let rawData;
                if (data) {
                    rawData = data;
                } else if (dataCache.has(dataUrl)) {
                    rawData = dataCache.get(dataUrl);
                } else {
                    let fetchedData;
                    if (dataUrl.startsWith('/')) {
                        const response = await fetch(dataUrl);
                        if (!response.ok) throw new Error(`Failed to fetch ${dataUrl}`);
                        fetchedData = await response.json();
                    } else {
                        const headers = { 'X-Auth-Key': BACKEND_API.API_KEY };
                        const response = await fetch(dataUrl, { headers });
                        if (!response.ok) throw new Error(`Failed to fetch ${dataUrl}`);
                        fetchedData = await response.json();
                    }
                    dataCache.set(dataUrl, fetchedData);
                    rawData = fetchedData;
                }

                if (!isActive) return;
                const filteredData = await applyDistrictFilter(rawData);
                if (!isActive) return;
                renderData(filteredData);
            } catch (err) {
                console.error("Error loading VectorGrid data:", err);
                if (onLoading) onLoading(false);
            }
        };

        fetchAndRender();

        return () => {
            isActive = false;
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            cleanupLayer();
        };
    }, [map, data, dataUrl, active, style, filter, layerName]);

    return null;
};

export default VectorGridSlicer;



