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

/**
 * Scatter Linear Regression
 * 
 * Calculates slope, intercept and R-squared for a set of [x, y] points.
 * Returns projection points for the min/max X values.
 */
export const calculateScatterRegression = (points) => {
    if (!points || !Array.isArray(points) || points.length < 2) return null;

    const validPoints = points.filter(p => Array.isArray(p) && p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]));
    const n = validPoints.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const [x, y] of validPoints) {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    }

    const denominator = (n * sumX2 - sumX * sumX);
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-Squared
    const rNum = (n * sumXY - sumX * sumY);
    const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const rSquared = rDen === 0 ? 0 : Math.pow(rNum / rDen, 2);

    const xValues = validPoints.map(p => p[0]);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);

    return {
        points: [[minX, slope * minX + intercept], [maxX, slope * maxX + intercept]],
        rSquared: rSquared.toFixed(3),
        slope: slope.toFixed(4)
    };
};
