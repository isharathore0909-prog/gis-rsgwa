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
        const controller = new AbortController();
        const signal = controller.signal;

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
                }, signal);
                if (!signal.aborted) setNearbyData(response && response.averages ? response : null);
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                console.error("Error fetching nearby aquifer data:", err);
            } finally {
                if (!signal.aborted) setNearbyLoading(false);
            }
        };

        fetchNearby();
        return () => controller.abort();
    }, [clickedLocation, isWellInventory, neighbor]);

    return {
        nearbyData,
        nearbyLoading
    };
};
