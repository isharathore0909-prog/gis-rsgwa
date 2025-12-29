// Sample rainfall data - matching locations with groundwater data
export const rainfallData = [
    { id: 'RF001', lat: 28.6139, lng: 77.2090, location: 'New Delhi', rainfall: 750, date: '2024-01-15' },
    { id: 'RF002', lat: 28.7041, lng: 77.1025, location: 'Gurgaon', rainfall: 680, date: '2024-01-15' },
    { id: 'RF003', lat: 28.5355, lng: 77.3910, location: 'Noida', rainfall: 720, date: '2024-01-15' },
    { id: 'RF004', lat: 28.4089, lng: 77.3178, location: 'Faridabad', rainfall: 650, date: '2024-01-15' },
    { id: 'RF005', lat: 28.6692, lng: 77.4538, location: 'Ghaziabad', rainfall: 710, date: '2024-01-15' },
    { id: 'RF006', lat: 28.3949, lng: 77.3080, location: 'Ballabhgarh', rainfall: 690, date: '2024-01-15' },
    { id: 'RF007', lat: 28.6128, lng: 77.2295, location: 'Delhi Central', rainfall: 740, date: '2024-01-15' },
    { id: 'RF008', lat: 28.5562, lng: 77.1000, location: 'Dwarka', rainfall: 670, date: '2024-01-15' },
    { id: 'RF009', lat: 28.4089, lng: 77.0931, location: 'Palwal', rainfall: 700, date: '2024-01-15' },
    { id: 'RF010', lat: 28.7289, lng: 77.1380, location: 'Rohini', rainfall: 680, date: '2024-01-15' },
    
    // Additional data points for different dates
    { id: 'RF001', lat: 28.6139, lng: 77.2090, location: 'New Delhi', rainfall: 820, date: '2024-02-15' },
    { id: 'RF002', lat: 28.7041, lng: 77.1025, location: 'Gurgaon', rainfall: 750, date: '2024-02-15' },
    { id: 'RF003', lat: 28.5355, lng: 77.3910, location: 'Noida', rainfall: 780, date: '2024-02-15' },
    { id: 'RF004', lat: 28.4089, lng: 77.3178, location: 'Faridabad', rainfall: 720, date: '2024-02-15' },
    { id: 'RF005', lat: 28.6692, lng: 77.4538, location: 'Ghaziabad', rainfall: 760, date: '2024-02-15' },
    
    { id: 'RF001', lat: 28.6139, lng: 77.2090, location: 'New Delhi', rainfall: 650, date: '2024-03-15' },
    { id: 'RF002', lat: 28.7041, lng: 77.1025, location: 'Gurgaon', rainfall: 600, date: '2024-03-15' },
    { id: 'RF003', lat: 28.5355, lng: 77.3910, location: 'Noida', rainfall: 680, date: '2024-03-15' },
];

// Get rainfall data for a specific date range
export const getRainfallDataByDateRange = (stations, startDate, endDate) => {
    if (!startDate || !endDate) return stations;
    
    return stations.filter(station => {
        const stationDate = new Date(station.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return stationDate >= start && stationDate <= end;
    });
};

// Calculate statistics
export const calculateStatistics = (data, type) => {
    if (!data || data.length === 0) {
        return {
            mean: 0,
            min: 0,
            max: 0,
            count: 0,
            stdDev: 0
        };
    }

    const values = type === 'groundwater' 
        ? data.map(item => item.waterLevel)
        : data.map(item => item.rainfall);

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
        mean: mean.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        count: values.length,
        stdDev: stdDev.toFixed(2)
    };
};

