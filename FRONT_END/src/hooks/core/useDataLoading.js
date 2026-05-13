import { useState, useEffect, useMemo } from 'react';
import { useBaseMapLoader } from './loaders/useBaseMapLoader';
import { useRainfallLoader } from './loaders/useRainfallLoader';
import { useWaterQualityLoader } from './loaders/useWaterQualityLoader';
import { useAquiferLoader } from './loaders/useAquiferLoader';
import { useRechargeLoader } from './loaders/useRechargeLoader';
import { useSecondaryLoader } from './loaders/useSecondaryLoader';
import useDebounce from './useDebounce';

/**
 * Handles all core application data fetching (Map Base, Rainfall, Overlays)
 * Refactored to compose specialized loader hooks.
 */
export const useDataLoading = (filters, neighbors) => {
    const [initRetry, setInitRetry] = useState(0);

    // Debounce filters to prevent rapid API calls during navigation/selection
    const debouncedFilters = useDebounce(filters, 400);
    const debouncedNeighbors = useDebounce(neighbors, 400);

    const baseMap = useBaseMapLoader(initRetry, setInitRetry);
    const rainfall = useRainfallLoader(debouncedFilters);
    const waterQuality = useWaterQualityLoader(debouncedFilters, debouncedNeighbors);
    const aquifer = useAquiferLoader(debouncedFilters);
    const recharge = useRechargeLoader(debouncedFilters);
    const secondary = useSecondaryLoader(debouncedFilters);

    // Sync block data when district selection changes (matching original logic)
    useEffect(() => {
        if (!filters?.district || !baseMap.rajasthanId) {
            if (secondary.originalStaticBlockDataRef.current) {
                secondary.setProcessedBlockData(secondary.originalStaticBlockDataRef.current);
            }
            return;
        }
        if (secondary.originalStaticBlockDataRef.current) {
            secondary.setProcessedBlockData(secondary.originalStaticBlockDataRef.current);
        }
    }, [filters?.district, baseMap.rajasthanId, secondary.originalStaticBlockDataRef]);

    return {
        // Base Map
        rajasthanData: baseMap.rajasthanData,
        setRajasthanData: baseMap.setRajasthanData,
        rajasthanId: baseMap.rajasthanId,
        setRajasthanId: baseMap.setRajasthanId,

        // Rainfall
        rainfallPoints: rainfall.rainfallPoints,
        setRainfallPoints: rainfall.setRainfallPoints,
        rainfallDataSource: rainfall.rainfallDataSource,
        setRainfallDataSource: rainfall.setRainfallDataSource,
        rainfallStations: rainfall.rainfallStations,
        setRainfallStations: rainfall.setRainfallStations,
        rainfallStationRecords: rainfall.rainfallStationRecords,
        setRainfallStationRecords: rainfall.setRainfallStationRecords,
        rainfallLoading: rainfall.rainfallLoading,
        setRainfallLoading: rainfall.setRainfallLoading,

        // Water Quality
        waterQualityRecords: waterQuality.waterQualityRecords,
        setWaterQualityRecords: waterQuality.setWaterQualityRecords,
        waterQualityLoading: waterQuality.waterQualityLoading,
        setWaterQualityLoading: waterQuality.setWaterQualityLoading,

        // Aquifer & Stats
        aquiferRecords: aquifer.aquiferRecords,
        setAquiferRecords: aquifer.setAquiferRecords,
        aquiferLoading: aquifer.aquiferLoading,
        setAquiferLoading: aquifer.setAquiferLoading,
        districtWaterLevelStats: aquifer.districtWaterLevelStats,

        // Recharge
        rechargeRecords: recharge.rechargeRecords,
        setRechargeRecords: recharge.setRechargeRecords,
        rechargeLoading: recharge.rechargeLoading,
        setRechargeLoading: recharge.setRechargeLoading,

        // Secondary
        canalData: secondary.canalData,
        setCanalData: secondary.setCanalData,
        waterbodyData: secondary.waterbodyData,
        setWaterbodyData: secondary.setWaterbodyData,
        microData: secondary.microData,
        setMicroData: secondary.setMicroData,
        waterResourcesLoading: secondary.waterResourcesLoading,
        setWaterResourcesLoading: secondary.setWaterResourcesLoading,
        processedBlockData: secondary.processedBlockData,
        setProcessedBlockData: secondary.setProcessedBlockData
    };
};
