/**
 * Robust Trend Calculation (Theil-Sen Estimator)
 * 
 * Uses the median of all pair-wise slopes to determine the trend.
 * This is much more resilient to outliers
 */
export const calculateRobustTrendLine = (data, dataKey) => {
    if (!data || !Array.isArray(data)) return null;

    const validPoints = data
        .map((d, i) => ({ x: i, y: parseFloat(d[dataKey]) }))
        .filter(p => !isNaN(p.y));

    if (validPoints.length < 2) return null;

    // 1. Calculate all possible slopes between pairs
    const slopes = [];
    for (let i = 0; i < validPoints.length; i++) {
        for (let j = i + 1; j < validPoints.length; j++) {
            const dy = validPoints[j].y - validPoints[i].y;
            const dx = validPoints[j].x - validPoints[i].x;
            if (dx !== 0) slopes.push(dy / dx);
        }
    }

    // 2. Identify the median slope
    slopes.sort((a, b) => a - b);
    const medianSlope = slopes[Math.floor(slopes.length / 2)];

    // 3. Calculate the median intercept based on this slope
    const intercepts = validPoints.map(p => p.y - medianSlope * p.x);
    intercepts.sort((a, b) => a - b);
    const medianIntercept = intercepts[Math.floor(intercepts.length / 2)];

    // 4. Project the line across all data points
    return data.map((d, i) => (medianSlope * i + medianIntercept));
};

/**
 * Standard Least Squares Trend Calculation
 */
export const calculateLinearTrendLine = (data, dataKey) => {
    if (!data || !Array.isArray(data)) return null;

    const validPoints = data.map((d, i) => ({ x: i, y: parseFloat(d[dataKey]) })).filter(p => !isNaN(p.y));
    if (validPoints.length < 2) return null;

    const n = validPoints.length;
    const sumX = validPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = validPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = validPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = validPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((d, i) => (slope * i + intercept));
};
