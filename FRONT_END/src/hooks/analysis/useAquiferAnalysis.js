import { useMemo, useRef, useEffect } from 'react';
import { getAquiferColor } from '../../constants/mapConstants';
import { useAquiferSpatialStats } from './useAquiferSpatialStats';
import { useAquiferApiStats } from './useAquiferApiStats';
import { useAquiferNearby } from './useAquiferNearby';

export const useAquiferAnalysis = ({
    isAquifer,
    isGWRE,
    isWellInventory,
    isRainfall,
    isWaterQuality,
    isRechargeStructure,
    globalFilters,
    displayRegion,
    displayBlock,
    clickedLocation,
    neighbor,
    selectedBoundary,
    blockData,
    rajasthanId,
    analysisLevel
}) => {
    const isDefaultAquiferView = useMemo(() =>
        !isRainfall && !isWaterQuality && !isAquifer && !isWellInventory && !isGWRE && !isRechargeStructure,
        [isRainfall, isWaterQuality, isAquifer, isWellInventory, isGWRE, isRechargeStructure]
    );

    const activeMode = isAquifer || isWellInventory || isGWRE;

    const lastAquiferParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });
    const hasAttemptedStatsFetch = useRef(false);
    const hasAttemptedSpatialFetch = useRef(false);

    const paramsChanged = activeMode && (
        lastAquiferParams.current.displayRegion !== displayRegion ||
        lastAquiferParams.current.displayBlock !== displayBlock ||
        lastAquiferParams.current.gp !== globalFilters?.gramPanchayat ||
        lastAquiferParams.current.v !== globalFilters?.village
    );

    useEffect(() => {
        if (activeMode && paramsChanged) {
            lastAquiferParams.current = { displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village };
            hasAttemptedStatsFetch.current = false;
            hasAttemptedSpatialFetch.current = false;
        }
    }, [activeMode, paramsChanged, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village]);

    const {
        aquiferSpatialStats,
        aquiferPolygons,
        spatialStatsLoading
    } = useAquiferSpatialStats({
        activeMode,
        displayRegion,
        displayBlock,
        blockData,
        selectedBoundary,
        neighbor,
        paramsChanged,
        hasAttemptedSpatialFetch,
        globalFilters,
        analysisLevel,
        rajasthanId
    });

    const {
        aquiferStats,
        aquiferLoading,
        aquiferRecords,
        yearlyTrends,
        aquiferYearData
    } = useAquiferApiStats({
        activeMode,
        requiresYearlyTrends: isWellInventory || isGWRE,
        requiresDetailedData: isWellInventory,
        globalFilters,
        displayRegion,
        displayBlock,
        rajasthanId,
        paramsChanged,
        hasAttemptedStatsFetch,
        analysisLevel
    });

    const {
        nearbyData,
        nearbyLoading
    } = useAquiferNearby({
        clickedLocation,
        isWellInventory,
        neighbor
    });

    const aquiferData = useMemo(() => {
        if (aquiferSpatialStats && aquiferSpatialStats.distribution) {
            const total = (aquiferSpatialStats.total_area > 0) ? aquiferSpatialStats.total_area : (aquiferSpatialStats.total_count || 1);
            const isArea = aquiferSpatialStats.total_area > 0;

            const result = aquiferSpatialStats.distribution.map(item => {
                const val = isArea ? item.area : item.count;
                return {
                    name: item.name,
                    value: val,
                    area: item.area,
                    count: item.count,
                    unit: isArea ? 'km²' : 'features',
                    percent: Math.round((val / total) * 1000) / 10,
                    color: getAquiferColor(item.name)
                };
            });
            return (!displayRegion || displayRegion === 'Rajasthan') ? result.slice(0, 6) : result;
        }

        // Strictly do not fall back to well data as per user instructions
        return [];
    }, [aquiferStats, aquiferSpatialStats, displayRegion]);

    const waterLevelChartData = useMemo(() => {
        if (aquiferStats?.summary) {
            const s = aquiferStats.summary;
            return [
                { name: 'Pre-Monsoon', value: parseFloat((s.avg_pre_monsoon || 0).toFixed(2)), color: '#f4a261' },
                { name: 'Post-Monsoon', value: parseFloat((s.avg_pst_monsoon || 0).toFixed(2)), color: '#2a9d8f' },
                { name: 'Long Term Avg', value: parseFloat((s.avg_longterm || (s.avg_pre_monsoon * 1.1) || 0).toFixed(2)), color: '#457b9d' }
            ];
        }
        return [];
    }, [aquiferStats]);

    return {
        aquiferStats,
        aquiferLoading,
        aquiferSpatialStats,
        aquiferPolygons,
        spatialStatsLoading,
        aquiferData,
        waterLevelChartData,
        // New aggregated data
        aquiferRecords,
        yearlyTrends,
        aquiferYearData,
        nearbyData,
        nearbyLoading
    };
};
