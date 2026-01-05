import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getNeighbors } from '../../utils/geoUtils';
import { groundwaterData } from '../../data/groundwaterData';

export function MapEvents({ onLocationClick }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            const neighbors = getNeighbors(lat, lng, groundwaterData);
            onLocationClick({ lat, lng }, neighbors);
        },
    });
    return null;
}

export function MapUpdater({ center, zoom, basemap, onMapReady }) {
    const map = useMap();

    useEffect(() => {
        if (onMapReady) {
            onMapReady(map);
        }
    }, [map, onMapReady]);

    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);

    return null;
}
