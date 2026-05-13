import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getNeighbors } from '../../utils/geoUtils';
import backendApi from '../../api/backendApi';

export function MapEvents({ onLocationClick }) {
    useMapEvents({
        async click(e) {
            const { lat, lng } = e.latlng;

            try {
                // Use the central API client to identify coordinates
                const data = await backendApi.pointIdentify(lat, lng);

                if (data && (data.district || data.block || data.gramPanchayat || data.village)) {
                    onLocationClick({ lat, lng }, [{
                        id: data.village || data.gramPanchayat || data.block || data.district,
                        location: data.village || data.gramPanchayat || data.block || data.district,
                        district: data.district,
                        block: data.block,
                        gramPanchayat: data.gramPanchayat,
                        village: data.village,
                        districtId: data.district_id,
                        blockId: data.block_id,
                        gpId: data.gp_id,
                        villageId: data.village_id,
                        districtCode: data.district_code,
                        blockCode: data.block_code,
                        gpCode: data.gp_code,
                        villageCode: data.village_code,
                        gw_category: data.gw_category,
                        aquifer: data.aquifer,
                        water_resource: data.water_resource,
                        rainfall: data.rainfall,
                        water_level: data.water_level,
                        type: data.village ? 'village' : (data.gramPanchayat ? 'gp' : (data.block ? 'block' : 'district'))
                    }]);
                }
            } catch (error) {
                console.error("Failed to identify click location:", error);
            }
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

    // Removed aggressive reset effect
    // useEffect(() => {
    //     map.setView(center, zoom);
    // }, [center, zoom, map]);

    return null;
}
