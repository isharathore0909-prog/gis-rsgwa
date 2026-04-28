export const processRainfallData = (filters, neighbors, rainfallPoints, rainfallStations, rainfallStationRecords, intersectingStationIds, rainfallStats) => {
    const baseFeatures = (neighbors && neighbors.length > 0) ? neighbors : (rainfallPoints || []);

    // ---------------------------------------------------------------------
    // PRIORITY: Show Station Data if available (as requested by user)
    // ---------------------------------------------------------------------
    if (rainfallStations && rainfallStations.length > 0) {

        // Group records by station for aggregation
        const recordsByStation = (rainfallStationRecords || []).reduce((acc, record) => {
            const sId = record.station || record.station_id;
            if (!acc[sId]) acc[sId] = [];
            acc[sId].push(record);
            return acc;
        }, {});

        const stationFeatures = rainfallStations.filter(station => {
            // If we have precise intersecting station IDs from the analysis hook, use them!
            if (intersectingStationIds && intersectingStationIds.length > 0) {
                return intersectingStationIds.includes(station.id) || intersectingStationIds.includes(station.station_id);
            }

            // Fallback to district filter if no precise IDs available
            if (filters.district) {
                return (station.district || '').toUpperCase() === filters.district.toUpperCase();
            }
            return true;
        }).map((station, idx) => {
            const sRecords = recordsByStation[station.id] || [];

            // Calculate stats
            const totalRainfall = sRecords.reduce((sum, r) => sum + (r.rainfall_mm || 0), 0);
            const avgRainfall = sRecords.length > 0 ? totalRainfall / sRecords.length : 0;

            // Sync count with backend stats if we only have one station selected (common case for Block/GP)
            let recordCount = sRecords.length;
            if (recordCount > 0 && rainfallStats?.count && (intersectingStationIds?.length === 1 || rainfallStats?.stationNames?.includes(station.name))) {
                recordCount = rainfallStats.count;
            }

            // Get latest record
            const latestRecord = sRecords.length > 0
                ? sRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                : null;

            return {
                type: 'Feature',
                id: `station-${station.id}`,
                properties: {
                    'Category': 'Rainfall Station',
                    'Station Name': station.name,
                    'District': station.district,
                    'Latest Date': latestRecord ? latestRecord.date : 'N/A',
                    'Latest Rainfall (mm)': latestRecord ? Number(latestRecord.rainfall_mm).toFixed(2) : '0.00',
                    'Total Rainfall (mm)': totalRainfall.toFixed(2),
                    'Avg Rainfall (mm)': avgRainfall.toFixed(2),
                    'Record Count': recordCount
                },
                geometry: {
                    type: 'Point',
                    coordinates: [station.longitude, station.latitude]
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features: stationFeatures
        };
    }

    // Fallback to existing village data logic
    return {
        type: 'FeatureCollection',
        features: baseFeatures.filter(item => {
            if (!item) return false;
            const props = item.properties || item;

            const dist = (props.district_name || props.district || props.DIST_NAME || props.District || '').toString().trim().toUpperCase();
            const blk = (props.block_name || props.block || props.BLOCK_NAME || props.Block || props.taluka || '').toString().trim().toUpperCase();
            const gp = (props.gram_panchayat_name || props.gram_panchayat || props.GP_NAME || props.GramPanchayat || '').toString().trim().toUpperCase();
            const vill = (props.village_name || props.village || props.VILL_NAME || props.Village || '').toString().trim().toUpperCase();

            const matchDist = !filters.district || dist === filters.district.trim().toUpperCase();
            const matchBlock = !filters.block || blk === filters.block.trim().toUpperCase();
            const matchGP = !filters.gramPanchayat || gp === filters.gramPanchayat.trim().toUpperCase();
            const matchVillage = !filters.village || vill === filters.village.trim().toUpperCase();

            if ((filters.village || filters.gramPanchayat) && rainfallPoints.length > 0) {
                const villageMatch = !filters.village || vill === filters.village.trim().toUpperCase();
                const gpMatch = !filters.gramPanchayat || gp === filters.gramPanchayat.trim().toUpperCase();
                return villageMatch && gpMatch;
            }

            return matchDist && matchBlock && matchGP && matchVillage;
        })
            .map((item, idx) => {
                const props = item.properties || item;
                const rainValue = props.rainfall_mm !== undefined ?
                    Number(props.rainfall_mm).toFixed(2) :
                    (props['Rainfall (mm)'] !== undefined ? Number(props['Rainfall (mm)']).toFixed(2) : '0.00');

                return {
                    type: 'Feature',
                    id: item.id || props.id || `rain-${idx}`,
                    properties: {
                        'Category': 'Rainfall',
                        'Date': props.date || props.rainfall_date || (props['Date'] || '-'),
                        'Rainfall (mm)': rainValue,
                        'District': props.district_name || props.district || props.DIST_NAME || props.District || '-',
                        'Block': props.block_name || props.block || props.BLOCK_NAME || props.Block || '-',
                        'Village': props.village_name || props.village || (props['Village'] || '-')
                    },
                    geometry: item.geometry || ((props.longitude && props.latitude) ? {
                        type: 'Point',
                        coordinates: [props.longitude, props.latitude]
                    } : null)
                };
            })
    };
};
