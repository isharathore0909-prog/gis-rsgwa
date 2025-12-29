// Sample groundwater data
export const groundwaterData = [
    { id: 'GW001', lat: 28.6139, lng: 77.2090, waterLevel: 8.5, ph: 7.2, tds: 450, nitrate: 12, fluoride: 0.8, location: 'New Delhi' },
    { id: 'GW002', lat: 28.7041, lng: 77.1025, waterLevel: 12.3, ph: 7.5, tds: 380, nitrate: 8, fluoride: 0.6, location: 'Gurgaon' },
    { id: 'GW003', lat: 28.5355, lng: 77.3910, waterLevel: 6.2, ph: 6.9, tds: 520, nitrate: 15, fluoride: 1.2, location: 'Noida' },
    { id: 'GW004', lat: 28.4089, lng: 77.3178, waterLevel: 15.8, ph: 7.8, tds: 320, nitrate: 5, fluoride: 0.4, location: 'Faridabad' },
    { id: 'GW005', lat: 28.6692, lng: 77.4538, waterLevel: 9.1, ph: 7.1, tds: 480, nitrate: 10, fluoride: 0.9, location: 'Ghaziabad' },
    { id: 'GW006', lat: 28.3949, lng: 77.3080, waterLevel: 11.5, ph: 7.3, tds: 410, nitrate: 9, fluoride: 0.7, location: 'Ballabhgarh' },
    { id: 'GW007', lat: 28.6128, lng: 77.2295, waterLevel: 7.8, ph: 7.0, tds: 490, nitrate: 13, fluoride: 1.0, location: 'Delhi Central' },
    { id: 'GW008', lat: 28.5562, lng: 77.1000, waterLevel: 13.2, ph: 7.6, tds: 360, nitrate: 7, fluoride: 0.5, location: 'Dwarka' },
    { id: 'GW009', lat: 28.4089, lng: 77.0931, waterLevel: 10.4, ph: 7.4, tds: 430, nitrate: 11, fluoride: 0.8, location: 'Palwal' },
    { id: 'GW010', lat: 28.7289, lng: 77.1380, waterLevel: 14.6, ph: 7.7, tds: 340, nitrate: 6, fluoride: 0.5, location: 'Rohini' },
];

// Helper function to get color based on water level
export const getWaterLevelColor = (level) => {
    if (level < 5) return '#0066cc';
    if (level < 10) return '#00ccff';
    if (level < 15) return '#00ff99';
    if (level < 20) return '#ffff00';
    if (level < 25) return '#ff9900';
    return '#ff3300';
};

// Get well status
export const getWellStatus = (well) => {
    let issues = [];
    if (well.waterLevel < 5) issues.push('Low water level');
    if (well.ph < 6.5 || well.ph > 8.5) issues.push('pH out of range');
    if (well.tds > 500) issues.push('High TDS');
    if (well.nitrate > 45) issues.push('High nitrate');
    if (well.fluoride > 1.5) issues.push('High fluoride');
    
    if (issues.length === 0) {
        return { class: 'good', text: 'Good' };
    } else if (issues.length <= 2) {
        return { class: 'warning', text: 'Warning' };
    } else {
        return { class: 'critical', text: 'Critical' };
    }
};

