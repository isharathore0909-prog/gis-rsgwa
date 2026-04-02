import { useMemo } from 'react';
import { getFeatureProperty } from '../../utils/geoUtils';
import {
    THEMATIC_PALETTE,
    BLUE_PALETTE,
    WATER_QUALITY_PALETTE,
    GWRE_COLORS,
    AQUIFER_COLORS
} from '../../constants/mapConstants';

/**
 * Generates legend data based on layer type and data
 */
export const useLegendData = (
    filters,
    legendFeature,
    numClasses,
    blockBoundaryData,
    gwreData,
    mapRainfallPoints,
    waterQualityRecords,
    aquiferRecords,
    districtRainfall
) => {
    return useMemo(() => {
        let values = [];
        const isBlockFeature = [
            'Category', 'Stage_of_G', 'GWDL', 'BLOCK_NAME', 'DIST_NAME',
            'POPULATION', 'AREA_SQ_KM', 'Dyna_mcm', 'Static_mcm',
            'Vill_Tow_C', 'avg_rainfall'
        ].includes(legendFeature) ||
            ['Ground Water Resource Estimation', 'Rainfall'].includes(filters?.type);

        // Rainfall Layer
        if (filters?.type === 'Rainfall') {
            const feature = ['total_rainfall', 'avg_rainfall', 'count'].includes(legendFeature)
                ? legendFeature
                : 'avg_rainfall';

            const hasDistStats = Object.keys(districtRainfall).length > 0;
            const distValues = hasDistStats ? Object.values(districtRainfall) : [];
            const pointValues = mapRainfallPoints.length ? mapRainfallPoints.map(p => p[feature]) : [];

            // Add block-level values if present (important for district drill-down)
            const blockValues = (blockBoundaryData?.features || [])
                .map(f => getFeatureProperty(f, feature))
                .filter(v => v !== null && v !== undefined && typeof v === 'number');

            if (hasDistStats || pointValues.length > 0 || blockValues.length > 0) {
                // Combine all data sources to ensure the legend scale covers everything.
                values = [...distValues, ...pointValues, ...blockValues];
            } else {
                // Return default legend for Rainfall if no data (0-100 mm) so palette is visible
                const min = 0;
                const max = 100;
                const range = max - min;
                const step = range / numClasses;

                // Always add "No Data" entry
                const defaultLegend = Array.from({ length: numClasses }, (_, i) => {
                    const rangeMin = min + (i * step);
                    const rangeMax = min + ((i + 1) * step);
                    // Better color distribution: map evenly across the blue palette
                    const colorIndex = Math.min(
                        Math.floor((i / (numClasses - 1)) * (BLUE_PALETTE.length - 1)),
                        BLUE_PALETTE.length - 1
                    );
                    return {
                        min: rangeMin, max: rangeMax,
                        color: BLUE_PALETTE[colorIndex],
                        label: `${rangeMin.toFixed(1)} mm - ${rangeMax.toFixed(1)} mm`,
                        isCategorical: false
                    };
                });

                defaultLegend.push({
                    label: 'No Data',
                    color: '#ccc',
                    isCategorical: false
                });

                return defaultLegend;
            }
        }
        // Water Quality Layer
        else if (filters?.type === 'Water Quality') {
            const items = [];
            if (filters.showEC) {
                items.push(
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
                );
            }
            if (filters.showNitrate) {
                items.push(
                    { label: 'Nitrate: < 10 mg/L', color: '#10b981' },
                    { label: 'Nitrate: 10–30 mg/L', color: '#34d399' },
                    { label: 'Nitrate: 30–50 mg/L', color: '#fde047' },
                    { label: 'Nitrate: 50–70 mg/L', color: '#fbbf24' },
                    { label: 'Nitrate: 70–90 mg/L', color: '#f97316' },
                    { label: 'Nitrate: > 90 mg/L', color: '#ef4444' }
                );
            }
            if (filters.showFluoride) {
                items.push(
                    { label: 'Fluoride: < 0.5 mg/L', color: '#10b981' },
                    { label: 'Fluoride: 0.5–1.0 mg/L', color: '#34d399' },
                    { label: 'Fluoride: 1.0–1.5 mg/L', color: '#fde047' },
                    { label: 'Fluoride: 1.5–2.0 mg/L', color: '#facc15' },
                    { label: 'Fluoride: 2.0–2.5 mg/L', color: '#fbbf24' },
                    { label: 'Fluoride: 2.5–3.0 mg/L', color: '#f97316' },
                    { label: 'Fluoride: > 3.0 mg/L', color: '#ef4444' }
                );
            }
            if (filters.showTDS) {
                items.push(
                    { label: 'TDS: < 500 mg/L', color: '#10b981' },
                    { label: 'TDS: 500–1000 mg/L', color: '#34d399' },
                    { label: 'TDS: 1000–1500 mg/L', color: '#fde047' },
                    { label: 'TDS: 1500–2000 mg/L', color: '#facc15' },
                    { label: 'TDS: 2000–2500 mg/L', color: '#fbbf24' },
                    { label: 'TDS: 2500–3000 mg/L', color: '#f97316' },
                    { label: 'TDS: > 3000 mg/L', color: '#ef4444' }
                );
            }
            if (items.length > 0) items.push({ label: 'No Data', color: '#ccc' });
            if (!items.length && !waterQualityRecords.length) return [];
            return items.length ? items : WATER_QUALITY_PALETTE;
        }
        // Ground Water Resource Estimation – always show GWDL category colors
        else if (filters?.type === 'Ground Water Resource Estimation') {
            return [
                { label: 'Safe', color: GWRE_COLORS.safe, isCategorical: true },
                { label: 'Semi Critical', color: GWRE_COLORS.semi, isCategorical: true },
                { label: 'Critical', color: GWRE_COLORS.critical, isCategorical: true },
                { label: 'Over Exploited', color: GWRE_COLORS.over, isCategorical: true },
                { label: 'Saline', color: GWRE_COLORS.saline, isCategorical: true },
                { label: 'No Data', color: '#ccc', isCategorical: true }
            ];
        }
        // Well Inventory – show aquifer type color swatches
        else if (filters?.type === 'Well Inventory') {
            return [
                ...Object.entries(AQUIFER_COLORS).map(([name, color]) => ({
                    label: name,
                    color,
                    isCategorical: true
                })),
                { label: 'No Data', color: '#ccc', isCategorical: true }
            ];
        }
        // Aquifer – show the aquifer type swatches (same palette)
        else if (filters?.type === 'Aquifer') {
            return [
                ...Object.entries(AQUIFER_COLORS).map(([name, color]) => ({
                    label: name,
                    color,
                    isCategorical: true
                })),
                { label: 'No Data', color: '#ccc', isCategorical: true }
            ];
        }
        // Water Resources – show enabled sub-layers
        else if (filters?.type === 'Water Resources') {
            const items = [];
            if (filters?.showCanals) items.push({ label: 'Canals', color: '#00bcd4', isCategorical: true });
            if (filters?.showWaterbodies) items.push({ label: 'Waterbodies', color: '#3b82f6', isCategorical: true });
            if (filters?.showMicro) items.push({ label: 'Micro Watershed', color: '#8b5cf6', isCategorical: true });
            if (filters?.showDams) items.push({ label: 'Dams', color: '#0ea5e9', isCategorical: true });
            return items;
        }
        else {
            return [];
        }

        // Filter out null/undefined values
        values = values.filter(v => v !== null && v !== undefined);
        if (!values.length) return [];

        const isCategorical = typeof values[0] === 'string';



        // Final Legend Assembly
        const finalLegend = isCategorical ? (
            /* Categorical logic same as before but stored in list */
            [...new Set(values)].sort().map((val, i) => {
                let color;
                const status = String(val).trim().toLowerCase();
                if (legendFeature === 'GWDL' || filters?.type === 'Ground Water Resource Estimation' || legendFeature === 'Category') {
                    if (status.includes('safe')) color = GWRE_COLORS.safe;
                    else if (status.includes('semi')) color = GWRE_COLORS.semi;
                    else if (status.includes('critical')) color = GWRE_COLORS.critical;
                    else if (status.includes('over')) color = GWRE_COLORS.over;
                    else if (status.includes('saline')) color = GWRE_COLORS.saline;
                    else color = GWRE_COLORS.default;
                } else {
                    const palette = filters?.type === 'Rainfall' ? BLUE_PALETTE : THEMATIC_PALETTE;
                    color = palette[i % palette.length];
                }
                return { label: val, value: val, color, isCategorical: true };
            })
        ) : (
            /* Numeric logic same as before but stored in list */
            (() => {
                const min = Math.min(...values);
                const max = Math.max(...values);
                if (min === max) {
                    const palette = filters?.type === 'Rainfall' ? BLUE_PALETTE : THEMATIC_PALETTE;
                    return [{
                        min, max,
                        color: palette[Math.floor(palette.length / 2)],
                        label: min.toFixed(1),
                        isCategorical: false
                    }];
                }
                const range = max - min;
                const step = range / numClasses;
                const isRainfall = filters?.type === 'Rainfall';
                return Array.from({ length: numClasses }, (_, i) => {
                    const rangeMin = min + (i * step);
                    const rangeMax = min + ((i + 1) * step);
                    const palette = isRainfall ? BLUE_PALETTE : THEMATIC_PALETTE;
                    // Better color distribution: map evenly across the palette
                    // This ensures the full range of colors is used
                    const colorIndex = Math.min(
                        Math.floor((i / (numClasses - 1)) * (palette.length - 1)),
                        palette.length - 1
                    );
                    const unit = isRainfall ? ' mm' : '';
                    return {
                        min: rangeMin, max: rangeMax,
                        color: palette[colorIndex],
                        label: `${rangeMin.toFixed(1)}${unit} - ${rangeMax.toFixed(1)}${unit}`,
                        isCategorical: false
                    };
                });
            })()
        );

        // Always add "No Data" entry to thematic legends
        if (finalLegend.length > 0) {
            finalLegend.push({
                label: 'No Data',
                color: '#ccc',
                isCategorical: false
            });
        }

        return finalLegend;
    }, [
        filters?.type,
        filters?.showEC,
        filters?.showNitrate,
        filters?.showFluoride,
        filters?.showTDS,
        filters?.showCanals,
        filters?.showWaterbodies,
        filters?.showMicro,
        filters?.showDams,
        legendFeature,
        numClasses,
        blockBoundaryData,
        gwreData,
        mapRainfallPoints,
        waterQualityRecords,
        aquiferRecords,
        districtRainfall
    ]);
};

/**
 * Generates feature options for legend dropdown
 */
export const useFeatureOptions = (layerType) => {
    return useMemo(() => {
        if (layerType === 'Rainfall') {
            return [
                { value: 'avg_rainfall', label: 'Average Rainfall (mm)' },
                { value: 'total_rainfall', label: 'Total Rainfall (mm)' },
                { value: 'count', label: 'Reading Count' },
                { value: 'Village', label: 'Village Name' }
            ];
        } else if (layerType === 'Ground Water Resource Estimation') {
            return [
                { value: 'Category', label: 'Ground Water Category' },
                { value: 'safe', label: 'Safe' },
                { value: 'critical', label: 'Critical' },
                { value: 'semi critical', label: 'Semi Critical' },
                { value: 'over exploited', label: 'Over Exploited' },
                { value: 'saline', label: 'Saline' }
            ];
        }

        return [
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
        ];
    }, [layerType]);
};
