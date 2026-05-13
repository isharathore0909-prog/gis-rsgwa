/**
 * waterLevelConstants.js
 * Shared constants for WaterLevelCharts and its sub-components.
 * Defined at module level so they are never re-created on re-render.
 */

export const PHYSICAL_METRICS = ['water_level', 'rainfall'];

export const HYDROGRAPH_OPTIONS = [
    { id: 'average', label: 'Average Water Level', color: '#1e3a8a' },
    { id: 'pre_monsoon', label: 'Pre Water Level', color: '#3b82f6' },
    { id: 'post_monsoon', label: 'Post Water Level', color: '#0ea5e9' },
];

export const PARAM_LABELS = {
    // Water Quality Parameters
    ec: 'EC (µS/cm)',
    ph: 'pH',
    tds: 'TDS (mg/l)',
    hardness: 'Hardness (mg/l)',
    alkalinity: 'Alkalinity (mg/l)',
    fluoride: 'Fluoride (mg/l)',
    nitrate: 'Nitrate (mg/l)',
    chloride: 'Chloride (mg/l)',
    sulphate: 'Sulphate (mg/l)',
    bicarbonate: 'Bicarbonate (mg/l)',
    carbonate: 'Carbonate (mg/l)',
    calcium: 'Calcium (mg/l)',
    magnesium: 'Magnesium (mg/l)',
    sodium: 'Sodium (mg/l)',
    potassium: 'Potassium (mg/l)',
    iron: 'Iron (mg/l)',
    arsenic: 'Arsenic (mg/l)',
    uranium: 'Uranium (µg/l)',
    // Physical Metrics
    water_level: 'Water Level (m.bgl)',
    rainfall: 'Annual Rainfall (mm)',
};

/** Pre-computed so the filter isn't re-run on every render inside JSX */
export const WQ_PARAM_ENTRIES = Object.entries(PARAM_LABELS).filter(
    ([val]) => !PHYSICAL_METRICS.includes(val)
);

/** Static style objects – defined once, never recreated on re-render */
export const STYLES = {
    tabBar: { display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' },
    chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    chartContainer: { height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' },
    emptyState: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' },
    selectStyle: {
        padding: '6px 12px',
        borderRadius: '8px',
        border: 'none',
        background: 'white',
        fontSize: '12px',
        fontWeight: 600,
        color: '#1e293b',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    divider: { padding: '0 2px', width: '1px', background: '#cbd5e1', height: '20px', margin: '0 4px' },
    vsLabel: { fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 4px', textTransform: 'uppercase' },
};
