import { useEffect } from 'react';

// Specialized hooks
import { useWaterQualityAnalysis } from './analysis/useWaterQualityAnalysis';
import { useRainfallAnalysis } from './analysis/useRainfallAnalysis';
import { useAquiferAnalysis } from './analysis/useAquiferAnalysis';
import { useGWREAnalysis } from './analysis/useGWREAnalysis';
import { useRechargeAnalysis } from './analysis/useRechargeAnalysis';

// ---------------------------------------------------------------------------
// useDataAnalysis Hook
// 
// Centralizes data fetching and processing for the DataAnalysisSidebar
// by composing specialized sub-hooks.
// ---------------------------------------------------------------------------
export const useDataAnalysis = ({
    globalFilters,
    clickedLocation,
    neighbors,
    selectedBoundary,
    blockData,
    rainfallPoints = [],
    rainfallStations = [],
    rainfallStationRecords = [],
    rainfallDataSource = 'station',
    parentRainfallLoading = false,
    parentWaterQualityLoading = false,
    parentAquiferLoading = false,
    parentRechargeLoading = false
}) => {
    // -------------------------------------------------------------------------
    // 1. Basic Derived Flags & Location Info
    // -------------------------------------------------------------------------
    const isGWRE = globalFilters?.type === 'Ground Water Resource Estimation';
    const isRainfall = globalFilters?.type === 'Rainfall';
    const isWaterQuality = globalFilters?.type === 'Water Quality';
    const isAquifer = globalFilters?.type === 'Aquifer';
    const isWellInventory = globalFilters?.type === 'Well Inventory';
    const isRechargeStructure = globalFilters?.type === 'Recharge Structure';

    const filterDistrict = globalFilters?.district;
    const filterBlock = globalFilters?.block || globalFilters?.taluka;
    const neighbor = neighbors && neighbors.length > 0 ? neighbors[0] : null;
    const clickedDistrict = neighbor?.district;
    const clickedBlock = neighbor?.id || neighbor?.location;

    const displayRegion = clickedDistrict || filterDistrict || neighbor?.location || null;
    const displayBlock = clickedBlock || filterBlock;

    const getAnalysisContext = () => {
        if (globalFilters?.village) return { level: 'Village', name: globalFilters.village };
        if (globalFilters?.gramPanchayat) return { level: 'Gram Panchayat', name: globalFilters.gramPanchayat };
        if (globalFilters?.block) return { level: 'Block', name: globalFilters.block };
        if (globalFilters?.district) return { level: 'District', name: globalFilters.district };
        return { level: 'State', name: 'Rajasthan' };
    };

    const { level: analysisLevel, name: analysisName } = getAnalysisContext();

    // -------------------------------------------------------------------------
    // 2. Compose Specialized Hooks
    // -------------------------------------------------------------------------

    // Water Quality
    const {
        waterQualityStats,
        waterQualityAvailability,
        waterQualityLoading,
        waterQualityError,
        qualityData,
        blockWaterQualityData
    } = useWaterQualityAnalysis({
        isWaterQuality,
        globalFilters,
        displayRegion,
        displayBlock,
        neighbor
    });

    // Rainfall
    const {
        rainfallStatsData,
        rainfallSummaryData,
        rainfallLoading,
        rainfallError
    } = useRainfallAnalysis({
        isRainfall,
        globalFilters,
        displayRegion,
        displayBlock,
        clickedLocation,
        neighbor,
        selectedBoundary,
        blockData,
        rainfallStations,
        rainfallDataSource,
        parentRainfallLoading
    });

    // Aquifer
    const {
        aquiferStats,
        aquiferLoading,
        aquiferSpatialStats,
        spatialStatsLoading,
        aquiferData,
        waterLevelChartData,
        spatialFilterApplied: aquiferSpatialFilterApplied,
        totalArea: aquiferTotalArea,
        totalCount: aquiferTotalCount
    } = useAquiferAnalysis({
        isAquifer, isGWRE, isWellInventory, isRainfall, isWaterQuality, isRechargeStructure,
        globalFilters, displayRegion, displayBlock, clickedLocation, neighbor,
        selectedBoundary, blockData
    });

    // GWRE
    const {
        gwreStats,
        gwreLoading,
        pieData,
        totalBlocks
    } = useGWREAnalysis({
        isGWRE,
        globalFilters,
        displayRegion,
        displayBlock
    });

    // Recharge Structure
    const {
        rechargeStats,
        rechargeLoading
    } = useRechargeAnalysis({
        isRechargeStructure,
        analysisLevel,
        analysisName,
        globalFilters,
        displayRegion,
        displayBlock
    });

    return {
        // Analysis Metadata
        analysisLevel,
        analysisName,
        displayRegion,
        displayBlock,
        neighbor,

        // Layer Flags
        isGWRE,
        isRainfall,
        isWaterQuality,
        isAquifer,
        isWellInventory,
        isRechargeStructure,

        // GWRE
        gwreStats,
        gwreLoading,
        pieData,
        totalBlocks,

        // Water Quality
        waterQualityStats,
        waterQualityAvailability,
        waterQualityLoading,
        waterQualityError,
        qualityData,
        blockWaterQualityData,

        // Aquifer
        aquiferStats,
        aquiferLoading: aquiferLoading || spatialStatsLoading,
        aquiferSpatialStats,
        aquiferData,
        waterLevelChartData,
        aquiferSpatialFilterApplied,
        aquiferTotalArea,
        aquiferTotalCount,

        // Rainfall
        rainfallStats: rainfallStatsData,
        rainfallSummaryData,
        rainfallError,
        rainfallLoading,

        // Recharge Structure
        rechargeStats,
        rechargeLoading
    };
};
