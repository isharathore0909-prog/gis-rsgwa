export const THEMATIC_PALETTE = ['#0066cc', '#00ccff', '#00ff99', '#ffff00', '#ff9900', '#ff3300', '#cc0000'];

export const BLUE_PALETTE = [
    '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
    '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'
];

export const DEFAULT_CENTER = [26.9124, 75.7873];
export const DEFAULT_ZOOM = 7;

export const AQUIFER_COLORS = {
    'Younger Alluvium': '#f9eb0f', // Bright Yellow
    'Older Alluvium': '#f8b195',  // Peach
    'Alluvium': '#4caf50',        // Green
    'Sandstone': '#f3722c',       // Orange
    'Schist': '#d84315',          // Deep Orange
    'Phyllite & Schist': '#d84315',
    'Phyllite': '#d84315',
    'Gneiss': '#ffb6c1',
    'Banded Gneissic Complex': '#ffb6c1',
    'BGC': '#ffb6c1',
    'Bilara Limestone': '#a0cfec',
    'Deccan Trap': '#77dd77',
    'Basalt': '#77dd77',
    'Granite': '#ff6961',
    'Jodhpur Sandstone': '#fac898',
    'Lathi Sandstone': '#c1c6fc',
    'Nagaur Sandstone': '#b0e0e6',
    'Quartzite': '#f49ac2',
    'Ryolite': '#cb99c9',
    'Rhyolite': '#cb99c9',
    'Tertiary Sandstone': '#eaddca',
    'Vindhyan Limestone': '#0abab5',
    'Vindhyan Sandstone': '#c23b22',
    'Limestone': '#98fb98',
    'Shale': '#a9a9a9',
    'Hills': '#808080',
    'Hilly Area': '#808080'
};

/**
 * Robust helper to get color for an aquifer type
 * @param {string} name - The aquifer type name
 * @returns {string} - Hex color code
 */
export const getAquiferColor = (name) => {
    if (!name) return '#3388ff';
    const trimmedName = name.toString().trim();
    const typeKey = Object.keys(AQUIFER_COLORS).find(k => k.toLowerCase() === trimmedName.toLowerCase());
    return AQUIFER_COLORS[typeKey] || '#3388ff';
};

export const WATER_QUALITY_PALETTE = [
    { label: 'Potable', value: 'Good', color: '#2a9d8f' },
    { label: 'Warning (Moderate)', value: 'Warning', color: '#f4a261' },
    { label: 'Non Potable', value: 'Critical', color: '#e63946' }
];

export const GWRE_COLORS = {
    'safe': '#28a745',
    'semi': '#ffc107',
    'critical': '#fd7e14',
    'over': '#dc3545',
    'saline': '#6c757d',
    'default': '#3388ff'
};
