import { useMemo } from 'react';
import { getFeatureProperty } from '../../utils/geoUtils';
import {
    THEMATIC_PALETTE,
    BLUE_PALETTE,
    WATER_QUALITY_PALETTE,
    GWRE_COLORS
} from '../../constants/mapConstants';
import {
    WATER_QUALITY_LEGENDS,
    GWRE_LEGEND,
    WELL_INVENTORY_LEGEND,
    STATIC_LEGENDS,
    WATER_RESOURCES_SUB_LAYERS,
    LEGEND_FEATURE_OPTIONS
} from '../../config/legendConfig';

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

        // Rainfall Layer
        if (filters?.type === 'Rainfall') {
            const feature = ['total_rainfall', 'avg_rainfall', 'count'].includes(legendFeature)
                ? legendFeature
                : 'avg_rainfall';

            const hasDistStats = Object.keys(districtRainfall).length > 0;
            const distValues = hasDistStats ? Object.values(districtRainfall) : [];
            const pointValues = mapRainfallPoints.length ? mapRainfallPoints.map(p => p[feature]) : [];

            const blockValues = (blockBoundaryData?.features || [])
                .map(f => getFeatureProperty(f, feature))
                .filter(v => v !== null && v !== undefined && typeof v === 'number');

            if (hasDistStats || pointValues.length > 0 || blockValues.length > 0) {
                values = [...distValues, ...pointValues, ...blockValues];
            } else {
                const min = 0;
                const max = 100;
                const range = max - min;
                const step = range / numClasses;

                const defaultLegend = Array.from({ length: numClasses }, (_, i) => {
                    const rangeMin = min + (i * step);
                    const rangeMax = min + ((i + 1) * step);
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

                defaultLegend.push({ label: 'No Data', color: '#ccc', isCategorical: false });
                return defaultLegend;
            }
        }
        // Water Quality Layer
        else if (filters?.type === 'Water Quality') {
            const items = [];
            if (filters.showEC) items.push(...WATER_QUALITY_LEGENDS.EC);
            if (filters.showNitrate) items.push(...WATER_QUALITY_LEGENDS.Nitrate);
            if (filters.showFluoride) items.push(...WATER_QUALITY_LEGENDS.Fluoride);
            if (filters.showTDS) items.push(...WATER_QUALITY_LEGENDS.TDS);
            if (filters.showPH) items.push(...WATER_QUALITY_LEGENDS.PH);


            if (items.length > 0) items.push({ label: 'No Data', color: '#ccc' });
            if (!items.length && !waterQualityRecords.length) return [];
            return items.length ? items : WATER_QUALITY_PALETTE;
        }
        // Ground Water Resource Estimation
        else if (filters?.type === 'Ground Water Resource Estimation') {
            return [...GWRE_LEGEND, { label: 'No Data', color: '#ccc', isCategorical: true }];
        }
        // Well Inventory
        else if (filters?.type === 'Well Inventory') {
            return [...WELL_INVENTORY_LEGEND, { label: 'No Data', color: '#cbd5e1', isCategorical: true }];
        }
        // Aquifer
        else if (filters?.type === 'Aquifer') {
            return [...STATIC_LEGENDS.Aquifer, { label: 'No Data', color: '#ccc', isCategorical: true }];
        }
        // Water Resources
        else if (filters?.type === 'Water Resources') {
            const items = [];
            if (filters?.showCanals) items.push(WATER_RESOURCES_SUB_LAYERS.canals);
            if (filters?.showWaterbodies) items.push(WATER_RESOURCES_SUB_LAYERS.waterbodies);
            if (filters?.showMicro) items.push(WATER_RESOURCES_SUB_LAYERS.micro);
            if (filters?.showDams) items.push(WATER_RESOURCES_SUB_LAYERS.dams);
            if (filters?.showRecharge) items.push(WATER_RESOURCES_SUB_LAYERS.recharge);
            return items;
        }
        else {
            return [];
        }

        values = values.filter(v => v !== null && v !== undefined);
        if (!values.length) return [];

        const isCategorical = typeof values[0] === 'string';

        // Final Legend Assembly
        const finalLegend = isCategorical ? (
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

        if (finalLegend.length > 0) {
            finalLegend.push({ label: 'No Data', color: '#ccc', isCategorical: false });
        }

        return finalLegend;
    }, [
        filters?.type,
        filters?.showEC, filters?.showNitrate, filters?.showFluoride, filters?.showTDS, filters?.showPH,
        filters?.showCanals, filters?.showWaterbodies, filters?.showMicro, filters?.showDams, filters?.showRecharge,

        legendFeature, numClasses, blockBoundaryData, gwreData, mapRainfallPoints, waterQualityRecords,
        aquiferRecords, districtRainfall
    ]);
};

/**
 * Generates feature options for legend dropdown
 */
export const useFeatureOptions = (layerType) => {
    return useMemo(() => {
        if (layerType === 'Rainfall') return LEGEND_FEATURE_OPTIONS.Rainfall;
        if (layerType === 'Ground Water Resource Estimation') return LEGEND_FEATURE_OPTIONS.GWRE;
        return LEGEND_FEATURE_OPTIONS.Default;
    }, [layerType]);
};
