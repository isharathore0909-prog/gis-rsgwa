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
