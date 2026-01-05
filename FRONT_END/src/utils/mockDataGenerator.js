// Helper to generate mock time series data
export const generateTimeSeriesData = (startDate, endDate, frequency = 'Monthly', baseValue = 10, variance = 2) => {
    const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const data = [];
    const labels = [];

    let current = new Date(start);

    while (current <= end) {
        // Format label
        labels.push(current.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

        // Generate random value around baseValue
        const val = Math.max(0, baseValue + (Math.random() * variance * 2 - variance));
        data.push(parseFloat(val.toFixed(2)));

        // Increment date based on frequency
        if (frequency === 'Daily') {
            current.setDate(current.getDate() + 1);
        } else if (frequency === 'Weekly') {
            current.setDate(current.getDate() + 7);
        } else if (frequency === 'Quarterly') {
            current.setMonth(current.getMonth() + 3);
        } else if (frequency === 'Yearly') {
            current.setFullYear(current.getFullYear() + 1);
        } else {
            // Default Monthly
            current.setMonth(current.getMonth() + 1);
        }
    }

    return { labels, data };
};
