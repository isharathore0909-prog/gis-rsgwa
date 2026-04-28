/**
 * Dashboard Metrics Registry
 * Maps metric IDs to their respective data and component configurations.
 * This ensures that new metrics can be added easily in the future.
 */
export const DASHBOARD_METRICS = {
    RAINFALL: {
        id: 'rainfall',
        title: 'Rainfall',
        icon: 'CloudRain',
        color: '#0ea5e9', // Sky Blue
        unit: 'mm',
        trendLabel: '',
    },
    GWRE: {
        id: 'gwre',
        title: 'Ground water resource extraction',
        icon: 'Droplets',
        color: '#3b82f6', // Bright Blue
        unit: '',
        trendLabel: '',
    },
    WATER_QUALITY: {
        id: 'water_quality',
        title: 'Water Quality',
        icon: 'Activity',
        color: '#2563eb', // Royal Blue
        unit: '',
        trendLabel: '',
    },
    WATER_LEVEL: {
        id: 'water_level',
        title: 'Water Level',
        icon: 'Waves',
        color: '#1d4ed8', // Deep Blue
        unit: '',
        trendLabel: '',
    },
    WATER_RESOURCES: {
        id: 'water_resources',
        title: 'Water Resources & Recharge Structures',
        icon: 'Building2',
        color: '#1e3a8a', // Navy Blue
        unit: 'Structures',
        trendLabel: 'identified',
    }
};

/**
 * Dashboard Layout Configuration
 * Defines the grid arrangement for the dashboard.
 * Rows and columns can be adjusted here without touching React components.
 */
export const dashboardGridConfig = [
    { id: 'map', area: '1 / 1 / 2 / 6', title: 'Map Overview' },
    { id: 'gwre', area: '1 / 6 / 2 / 9', metricId: 'GWRE' },
    { id: 'rainfall', area: '1 / 9 / 2 / 13', metricId: 'RAINFALL' },
    { id: 'water_quality', area: '2 / 1 / 3 / 5', metricId: 'WATER_QUALITY' },
    { id: 'water_level', area: '2 / 5 / 3 / 9', metricId: 'WATER_LEVEL' },
    { id: 'water_resources', area: '2 / 9 / 3 / 13', metricId: 'WATER_RESOURCES' },
];
