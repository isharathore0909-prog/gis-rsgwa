// Sample groundwater data for Rajasthan districts
export const groundwaterData = [
    { id: 'W-001', location: 'Jaipur Central', district: 'Jaipur', lat: 26.9124, lng: 75.7873, waterLevel: 12.5, ph: 7.2, tds: 450, nitrate: 22, fluoride: 0.8 },
    { id: 'W-002', location: 'Jodhpur East', district: 'Jodhpur', lat: 26.2389, lng: 73.0243, waterLevel: 25.8, ph: 7.8, tds: 850, nitrate: 35, fluoride: 1.2 },
    { id: 'W-003', location: 'Udaipur North', district: 'Udaipur', lat: 24.5854, lng: 73.7125, waterLevel: 8.4, ph: 6.9, tds: 320, nitrate: 18, fluoride: 0.5 },
    { id: 'W-004', location: 'Bikaner West', district: 'Bikaner', lat: 28.0229, lng: 73.3119, waterLevel: 45.2, ph: 8.1, tds: 1200, nitrate: 55, fluoride: 1.8 },
    { id: 'W-005', location: 'Ajmer South', district: 'Ajmer', lat: 26.4499, lng: 74.6399, waterLevel: 18.6, ph: 7.4, tds: 580, nitrate: 28, fluoride: 1.0 },
    { id: 'W-006', location: 'Kota Industrial', district: 'Kota', lat: 25.2138, lng: 75.8648, waterLevel: 10.2, ph: 7.1, tds: 650, nitrate: 30, fluoride: 0.9 },
    { id: 'W-007', location: 'Barmer Desert', district: 'Barmer', lat: 25.7532, lng: 71.3836, waterLevel: 55.4, ph: 8.3, tds: 1500, nitrate: 12, fluoride: 2.1 },
    { id: 'W-008', location: 'Alwar Border', district: 'Alwar', lat: 27.5530, lng: 76.6346, waterLevel: 22.1, ph: 7.5, tds: 480, nitrate: 62, fluoride: 0.7 }
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
