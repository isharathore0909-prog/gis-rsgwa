/**
 * Transform station rainfall data to GeoJSON format for AttributeTable
 */
export const transformStationDataToGeoJSON = (stations, records) => {
    if (!stations || !Array.isArray(stations) || stations.length === 0) {
        return { type: 'FeatureCollection', features: [] };
    }

    // Group records by station
    const recordsByStation = (records || []).reduce((acc, record) => {
        const stationId = record.station || record.station_id;
        if (!acc[stationId]) acc[stationId] = [];
        acc[stationId].push(record);
        return acc;
    }, {});

    // Create features for each station
    const features = stations.map((station, idx) => {
        const stationRecords = recordsByStation[station.id] || [];
        const totalRainfall = stationRecords.reduce((sum, r) => sum + (r.rainfall_mm || 0), 0);
        const avgRainfall = stationRecords.length > 0 ? totalRainfall / stationRecords.length : 0;
        const maxRainfall = stationRecords.length > 0
            ? Math.max(...stationRecords.map(r => r.rainfall_mm || 0))
            : 0;
        const minRainfall = stationRecords.length > 0
            ? Math.min(...stationRecords.map(r => r.rainfall_mm || 0))
            : 0;

        // Get latest record
        const latestRecord = stationRecords.length > 0
            ? stationRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            : null;

        return {
            type: 'Feature',
            id: `station-${station.id}`,
            properties: {
                'Station Name': station.name || 'N/A',
                'District': station.district || 'N/A',
                'Total Records': stationRecords.length,
                'Total Rainfall (mm)': totalRainfall.toFixed(2),
                'Average Rainfall (mm)': avgRainfall.toFixed(2),
                'Max Rainfall (mm)': maxRainfall.toFixed(2),
                'Min Rainfall (mm)': minRainfall.toFixed(2),
                'Latest Rainfall (mm)': latestRecord ? latestRecord.rainfall_mm.toFixed(2) : 'N/A',
                'Latest Date': latestRecord ? latestRecord.date : 'N/A',
                'Latitude': station.latitude ? station.latitude.toFixed(6) : 'N/A',
                'Longitude': station.longitude ? station.longitude.toFixed(6) : 'N/A'
            },
            geometry: {
                type: 'Point',
                coordinates: [station.longitude, station.latitude]
            }
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
};

/**
 * Transform village rainfall data to GeoJSON format for AttributeTable
 */
export const transformVillageRainfallToGeoJSON = (rainfallPoints) => {
    if (!rainfallPoints || !Array.isArray(rainfallPoints) || rainfallPoints.length === 0) {
        return { type: 'FeatureCollection', features: [] };
    }

    const features = rainfallPoints.map((record, idx) => {
        const rainValue = record.rainfall_mm ?? record.rainfall_in_mm ?? 0;

        return {
            type: 'Feature',
            id: record.id || `rainfall-${idx}`,
            properties: {
                'Village': record.village || record.village_name || 'N/A',
                'Gram Panchayat': record.gram_panchayat_name || record.gp_name || 'N/A',
                'Block': record.block_name || 'N/A',
                'District': record.district_name || 'N/A',
                'Rainfall (mm)': rainValue.toFixed(2),
                'Date': record.date || record.rainfall_date || 'N/A',
                'Gauge Type': record.gauge_type || 'N/A',
                'Latitude': record.latitude ? record.latitude.toFixed(6) : 'N/A',
                'Longitude': record.longitude ? record.longitude.toFixed(6) : 'N/A'
            },
            geometry: {
                type: 'Point',
                coordinates: [record.longitude, record.latitude]
            }
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
};
