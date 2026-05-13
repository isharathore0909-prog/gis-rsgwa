/**
 * Legend Configuration
 * 
 * Centralized store for all map legend definitions, colors, and thresholds.
 */
import { GWRE_COLORS, AQUIFER_COLORS } from '../constants/mapConstants';

export const WATER_QUALITY_LEGENDS = {
    EC: [
        { label: 'EC: < 500 µS/cm', color: '#10b981' },
        { label: 'EC: 500–1000 µS/cm', color: '#34d399' },
        { label: 'EC: 1000–1500 µS/cm', color: '#6ee7b7' },
        { label: 'EC: 1500–2000 µS/cm', color: '#a7f3d0' },
        { label: 'EC: 2000–2500 µS/cm', color: '#fef08a' },
        { label: 'EC: 2500–3000 µS/cm', color: '#fde047' },
        { label: 'EC: 3000–3500 µS/cm', color: '#facc15' },
        { label: 'EC: 3500–4000 µS/cm', color: '#fbbf24' },
        { label: 'EC: 4000–4500 µS/cm', color: '#f59e0b' },
        { label: 'EC: 4500–5000 µS/cm', color: '#f97316' },
        { label: 'EC: > 5000 µS/cm', color: '#ef4444' }
    ],
    Nitrate: [
        { label: 'Nitrate: < 10 mg/L', color: '#10b981' },
        { label: 'Nitrate: 10–30 mg/L', color: '#34d399' },
        { label: 'Nitrate: 30–50 mg/L', color: '#fde047' },
        { label: 'Nitrate: 50–70 mg/L', color: '#fbbf24' },
        { label: 'Nitrate: 70–90 mg/L', color: '#f97316' },
        { label: 'Nitrate: > 90 mg/L', color: '#ef4444' }
    ],
    Fluoride: [
        { label: 'Fluoride: < 1.5 mg/L (Safe)', color: '#10b981' },
        { label: 'Fluoride: 1.5–3.0 mg/L', color: '#facc15' },
        { label: 'Fluoride: 3.0–10.0 mg/L', color: '#ef4444' },
        { label: 'Fluoride: 10.0–25.0 mg/L', color: '#dc2626' },
        { label: 'Fluoride: 25.0–50.0 mg/L', color: '#991b1b' },
        { label: 'Fluoride: 50.0–100.0 mg/L', color: '#7f1d1d' },
        { label: 'Fluoride: > 100.0 mg/L', color: '#450a0a' }
    ],
    TDS: [
        { label: 'TDS: < 500 mg/L', color: '#10b981' },
        { label: 'TDS: 500–1000 mg/L', color: '#34d399' },
        { label: 'TDS: 1000–1500 mg/L', color: '#fde047' },
        { label: 'TDS: 1500–2000 mg/L', color: '#facc15' },
        { label: 'TDS: 2000–2500 mg/L', color: '#fbbf24' },
        { label: 'TDS: 2500–3000 mg/L', color: '#f97316' },
        { label: 'TDS: > 3000 mg/L', color: '#ef4444' }
    ],
    PH: [
        { label: 'pH: < 6.5', color: '#ef4444' },
        { label: 'pH: 6.5–7.0', color: '#fbbf24' },
        { label: 'pH: 7.0–8.5', color: '#10b981' },
        { label: 'pH: 8.5–9.0', color: '#f97316' },
        { label: 'pH: > 9.0', color: '#ef4444' }
    ]
};

export const GWRE_LEGEND = [
    { label: 'Safe', color: GWRE_COLORS.safe, isCategorical: true },
    { label: 'Semi Critical', color: GWRE_COLORS.semi, isCategorical: true },
    { label: 'Critical', color: GWRE_COLORS.critical, isCategorical: true },
    { label: 'Over Exploited', color: GWRE_COLORS.over, isCategorical: true },
    { label: 'Saline', color: GWRE_COLORS.saline, isCategorical: true }
];

export const WELL_INVENTORY_LEGEND = [
    { label: 'Water Level < 0m (Surface)', color: '#2196f3', isCategorical: true },
    { label: 'Water Level 0–10m (Good)', color: '#4caf50', isCategorical: true },
    { label: 'Water Level 10–30m', color: '#ffc107', isCategorical: true },
    { label: 'Water Level 30–50m (Stress)', color: '#f44336', isCategorical: true },
    { label: 'Water Level > 50m (High Stress)', color: '#b91c1c', isCategorical: true }
];

export const STATIC_LEGENDS = {
    Aquifer: [
        ...Object.entries(AQUIFER_COLORS).map(([name, color]) => ({
            label: name,
            color,
            isCategorical: true
        }))
    ]
};

export const WATER_RESOURCES_SUB_LAYERS = {
    canals: { label: 'Canals', color: '#00bcd4', isCategorical: true },
    waterbodies: { label: 'Waterbodies', color: '#3b82f6', isCategorical: true },
    micro: { label: 'Micro Watershed', color: '#8b5cf6', isCategorical: true },
    dams: { label: 'Dams', color: '#0ea5e9', isCategorical: true },
    recharge: { label: 'Recharge Structures', color: '#22c55e', isCategorical: true }
};

export const LEGEND_FEATURE_OPTIONS = {
    Rainfall: [
        { value: 'avg_rainfall', label: 'Average Rainfall (mm)' },
        { value: 'total_rainfall', label: 'Total Rainfall (mm)' },
        { value: 'count', label: 'Reading Count' },
        { value: 'Village', label: 'Village Name' }
    ],
    GWRE: [
        { value: 'Category', label: 'Ground Water Category' },
        { value: 'block_status', label: 'Block Status' },
        { value: 'safe', label: 'Safe' },
        { value: 'critical', label: 'Critical' },
        { value: 'semi critical', label: 'Semi Critical' },
        { value: 'over exploited', label: 'Over Exploited' },
        { value: 'saline', label: 'Saline' }
    ],
    Default: [
        { value: 'Category', label: 'Ground Water Category' },
        { value: 'Stage_of_G', label: 'Stage of GW Development (%)' },
        { value: 'GWDL', label: 'Ground Water Development Level' },
        { value: 'BLOCK_NAME', label: 'Block Name' },
        { value: 'DIST_NAME', label: 'District Name' },
        { value: 'POPULATION', label: 'Population' },
        { value: 'AREA_SQ_KM', label: 'Area (sq km)' },
        { value: 'Dyna_mcm', label: 'Dynamic GW (mcm)' },
        { value: 'Static_mcm', label: 'Static GW (mcm)' },
        { value: 'Vill_Tow_C', label: 'Village Count' }
    ]
};
