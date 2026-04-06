import { useState, useEffect, useRef } from 'react';
import api from '../../api';

export const useAquiferNearby = ({
    clickedLocation,
    isWellInventory,
    neighbor
}) => {
    const [nearbyData, setNearbyData] = useState(null);
    const [nearbyLoading, setNearbyLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!clickedLocation || !isWellInventory || (neighbor && neighbor.type === 'well_inventory_well')) {
            setNearbyData(null);
            return;
        }

        const fetchNearby = async () => {
            setNearbyLoading(true);
            try {
                const response = await api.aquifer.getNearby({
                    latitude: clickedLocation.lat,
                    longitude: clickedLocation.lng,
                    radius_km: 10
                });
                if (!ignore) setNearbyData(response && response.averages ? response : null);
            } catch (err) {
                console.error("Error fetching nearby aquifer data:", err);
            } finally {
                if (!ignore) setNearbyLoading(false);
            }
        };

        fetchNearby();
        return () => { ignore = true; };
    }, [clickedLocation, isWellInventory, neighbor]);

    return {
        nearbyData,
        nearbyLoading
    };
};
