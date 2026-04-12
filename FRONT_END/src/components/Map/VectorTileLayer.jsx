import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '../leaflet-polyfills'; // patch L.DomEvent.fakeStop removed in Leaflet 1.9
import 'leaflet.vectorgrid';

/**
 * VectorTileLayer Component
 * 
 * Renders vector tiles (Protobuf) using Leaflet.VectorGrid.
 * It handles the lifecycle of the layer (add/remove) on the map.
 * 
 * @param {string} url - The URL template for the vector tiles (e.g. http://server/{z}/{x}/{y}.pbf)
 * @param {object} style - The style configuration for the vector grid.
 * @param {boolean} active - Whether the layer should be visible.
 */
const VectorTileLayer = ({ url, style, active, layerName }) => {
    const map = useMap();

    useEffect(() => {
        if (!active) return;

        // Leaflet.VectorGrid requires the style to be keyed by the layer name within the vector tile.
        // If 'layerName' is provided, we wrap the style in that key.
        // Otherwise, we pass the style object directly (assuming it's already structured or applied globally).

        let vectorWebStyles = {};
        if (layerName && style) {
            vectorWebStyles[layerName] = style;
        } else if (style) {
            vectorWebStyles = style;
        }

        const vectorGridLayer = L.vectorGrid.protobuf(url, {
            rendererFactory: L.canvas.tile,
            vectorTileLayerStyles: vectorWebStyles,
            interactive: true,
            getFeatureId: (f) => {
                // Return a unique ID for the feature to enable interaction/highlighting
                return f.properties.id || f.properties.FID || f.properties.OBJECTID;
            }
        });

        // Event listeners can be added here if needed
        vectorGridLayer.on('click', (e) => {
            // e.layer is the feature that was clicked
            L.popup()
                .setLatLng(e.latlng)
                .setContent(`<pre>${JSON.stringify(e.layer.properties, null, 2)}</pre>`)
                .openOn(map);
        });

        vectorGridLayer.addTo(map);

        return () => {
            if (map.hasLayer(vectorGridLayer)) {
                map.removeLayer(vectorGridLayer);
            }
        };
    }, [map, url, style, active, layerName]);

    return null;
};

export default VectorTileLayer;
