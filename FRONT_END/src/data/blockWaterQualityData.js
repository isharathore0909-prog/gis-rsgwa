// Check if parameter exceeds safe limits
export const checkWaterQualityStatus = (data) => {
    const limits = {
        ec: 3000,        // µS/cm
        fluoride: 1.5,   // mg/l
        nitrate: 45,     // mg/l
        iron: 1.0,       // mg/l
        arsenic: 10,     // µg/l
        uranium: 30,     // µg/l
        tds: 2000,       // mg/l
        ph: { min: 6.5, max: 8.5 },
        chloride: 1000,  // mg/l
        hardness: 600    // mg/l as CaCO3
    };

    const issues = [];

    if (data.ec && data.ec > limits.ec) issues.push('High EC');
    if (data.fluoride && data.fluoride > limits.fluoride) issues.push('High Fluoride');
    if (data.nitrate && data.nitrate > limits.nitrate) issues.push('High Nitrate');
    if (data.iron && data.iron > limits.iron) issues.push('High Iron');
    if (data.arsenic && data.arsenic > limits.arsenic) issues.push('High Arsenic');
    if (data.uranium && data.uranium > limits.uranium) issues.push('High Uranium');
    if (data.tds && data.tds > limits.tds) issues.push('High TDS');
    if (data.ph && (data.ph < limits.ph.min || data.ph > limits.ph.max)) issues.push('pH out of range');
    if (data.chloride && data.chloride > limits.chloride) issues.push('High Chloride');
    if (data.hardness && data.hardness > limits.hardness) issues.push('High Hardness');

    if (issues.length === 0) {
        return { status: 'good', class: 'good', text: 'Good Quality', issues: [] };
    } else if (issues.length <= 2) {
        return { status: 'warning', class: 'warning', text: 'Moderate Quality', issues };
    } else {
        return { status: 'critical', class: 'critical', text: 'Poor Quality', issues };
    }
};

// Get parameter color based on value and safe limit
export const getParameterColor = (parameter, value) => {
    const limits = {
        ec: 3000,
        fluoride: 1.5,
        nitrate: 45,
        iron: 1.0,
        arsenic: 10,
        uranium: 30,
        tds: 2000,
        chloride: 1000,
        hardness: 600
    };

    if (!limits[parameter]) return '#4CAF50'; // Default green

    const limit = limits[parameter];
    const ratio = value / limit;

    if (ratio <= 0.5) return '#4CAF50'; // Green - Safe
    if (ratio <= 0.8) return '#8BC34A'; // Light Green - Acceptable
    if (ratio <= 1.0) return '#FFC107'; // Yellow - Warning
    if (ratio <= 1.5) return '#FF9800'; // Orange - Moderate Risk
    return '#F44336'; // Red - High Risk
};

// Calculate overall water quality index
export const calculateWQI = (data) => {
    const weights = {
        ec: 0.15,
        fluoride: 0.15,
        nitrate: 0.15,
        iron: 0.10,
        arsenic: 0.15,
        uranium: 0.10,
        tds: 0.10,
        ph: 0.05,
        chloride: 0.05
    };

    const limits = {
        ec: 3000,
        fluoride: 1.5,
        nitrate: 45,
        iron: 1.0,
        arsenic: 10,
        uranium: 30,
        tds: 2000,
        ph: 7.0,
        chloride: 1000
    };

    let wqi = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(param => {
        if (data[param] !== undefined && data[param] !== null) {
            const value = data[param];
            const limit = limits[param];

            let qi;
            if (param === 'ph') {
                // pH has optimal range
                qi = Math.abs(value - 7.0) / 1.5 * 100;
            } else {
                qi = (value / limit) * 100;
            }

            wqi += qi * weights[param];
            totalWeight += weights[param];
        }
    });

    if (totalWeight === 0) return null;

    const finalWQI = wqi / totalWeight;

    // Classify WQI
    let classification;
    if (finalWQI < 50) classification = 'Excellent';
    else if (finalWQI < 100) classification = 'Good';
    else if (finalWQI < 200) classification = 'Poor';
    else if (finalWQI < 300) classification = 'Very Poor';
    else classification = 'Unsuitable';

    return {
        value: Math.round(finalWQI),
        classification
    };
};
