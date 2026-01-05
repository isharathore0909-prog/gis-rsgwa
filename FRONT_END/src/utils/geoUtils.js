export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

export const getNeighbors = (lat, lon, stations, min = 5, max = 10) => {
    const stationsWithDistance = stations.map(s => ({
        ...s,
        distance: calculateDistance(lat, lon, s.lat, s.lng)
    }));

    // Sort by distance
    stationsWithDistance.sort((a, b) => a.distance - b.distance);

    // Take max 10
    return stationsWithDistance.slice(0, Math.max(min, Math.min(max, stationsWithDistance.length)));
};
