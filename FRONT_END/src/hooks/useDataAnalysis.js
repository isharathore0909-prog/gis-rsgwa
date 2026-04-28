import { useEffect, useMemo } from 'react';

// Specialized hooks
import { useWaterQualityAnalysis } from './analysis/useWaterQualityAnalysis';
import { useRainfallAnalysis } from './analysis/useRainfallAnalysis';
import { useAquiferAnalysis } from './analysis/useAquiferAnalysis';
import { useGWREAnalysis } from './analysis/useGWREAnalysis';
import { useRechargeAnalysis } from './analysis/useRechargeAnalysis';
import { useWellRainfall } from './data/WellInventory/useWellRainfall';

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
    dynamicBoundaries = [],
    blockData,
    rainfallPoints = [],
    rainfallStations = [],
    rainfallStationRecords = [],
    rainfallDataSource = 'station',
    parentRainfallLoading = false,
    parentWaterQualityLoading = false,
    parentAquiferLoading = false,
    parentRechargeLoading = false,
    rajasthanId // Backend readiness signal
}) => {
    const isDashboard = !globalFilters?.type || globalFilters?.type === '';

    // -------------------------------------------------------------------------
    // 1. Basic Derived Flags & Location Info
    // -------------------------------------------------------------------------
    const isGWRE = globalFilters?.type === 'Ground Water Resource Estimation';
    const isRainfall = globalFilters?.type === 'Rainfall';
    const isWaterQuality = globalFilters?.type === 'Water Quality';
    const isAquifer = globalFilters?.type === 'Aquifer';
    const isWellInventory = globalFilters?.type === 'Well Inventory';
    const isRechargeStructure = globalFilters?.type === 'Recharge Structure';
    const isWaterResources = globalFilters?.type === 'Water Resources';

    const filterDistrict = globalFilters?.district;
    const filterBlock = globalFilters?.block || globalFilters?.taluka;
    const neighbor = neighbors && neighbors.length > 0 ? neighbors[0] : null;

    // Neighbors can be either administrative units (polygons) or point features (wells). 
    // We must distinguish between them to prevent well IDs from overriding regional filters.
    const isPointFeature = neighbor?.type === 'well_inventory_well' || neighbor?.type === 'water_quality_well' || neighbor?.type === 'piezometer';

    // Only derive region/block from neighbor if it's NOT a point feature 
    // (i.e. if it's a district/block polygon clicked on the map)
    const neighborDistrict = !isPointFeature ? (neighbor?.district || neighbor?.DISTRICT) : null;
    const neighborBlock = !isPointFeature ? (neighbor?.block || neighbor?.BLOCK_NAME || neighbor?.id) : null;

    const displayRegion = neighborDistrict || filterDistrict || null;
    const displayBlock = neighborBlock || filterBlock;

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
        isWaterQuality: isWaterQuality || isGWRE || isWellInventory || (!isRainfall && !isAquifer && !isWellInventory && !isRechargeStructure && !isWaterResources),
        globalFilters,
        displayRegion,
        displayBlock,
        neighbor,
        rajasthanId,
        analysisLevel
    });

    // Rainfall
    const {
        rainfallStatsData,
        rainfallSummaryData,
        rainfallDistributionData,
        overallDistribution,
        intersectingStationIds,
        rainfallLoading,
        rainfallError
    } = useRainfallAnalysis({
        isRainfall: isRainfall || isGWRE || isDashboard,
        globalFilters,
        displayRegion,
        displayBlock,
        clickedLocation,
        neighbor,
        selectedBoundary,
        blockData,
        rainfallStations,
        dynamicBoundaries,
        rainfallDataSource,
        parentRainfallLoading,
        rajasthanId,
        analysisLevel
    });

    // Aquifer
    const {
        aquiferStats,
        aquiferLoading,
        aquiferSpatialStats,
        spatialStatsLoading,
        aquiferData,
        waterLevelChartData,
        aquiferPolygons,
        aquiferRecords,
        yearlyTrends,
        nearbyData,
        nearbyLoading
    } = useAquiferAnalysis({
        isAquifer, isGWRE, isWellInventory, isRainfall, isWaterQuality, isRechargeStructure,
        globalFilters, displayRegion, displayBlock, clickedLocation, neighbor,
        selectedBoundary, blockData, rajasthanId,
        analysisLevel
    });

    // Derive fields previously returned by useAquiferAnalysis
    const aquiferTotalArea = aquiferSpatialStats?.total_area || 0;
    const aquiferTotalCount = aquiferSpatialStats?.total_count || 0;
    const aquiferSpatialFilterApplied = !!aquiferSpatialStats;
    // -------------------------------------------------------------------------

    // Yearly Rainfall for Hydrographs
    const { rainfallData: yearlyRainfallData } = useWellRainfall({
        displayRegion,
        displayBlock,
        globalFilters,
        selectedWell: null,
        rainfallStations
    });

    // GWRE
    const {
        gwreStats,
        gwreFeatures,
        gwreLoading,
        pieData,
        totalBlocks
    } = useGWREAnalysis({
        isGWRE,
        globalFilters,
        displayRegion,
        displayBlock,
        rajasthanId,
        analysisLevel
    });

    // Recharge Structure
    const {
        rechargeStats,
        rechargeLoading
    } = useRechargeAnalysis({
        isRechargeStructure: isRechargeStructure || isDashboard,
        analysisLevel,
        analysisName,
        globalFilters,
        displayRegion,
        displayBlock,
        rajasthanId
    });

    return useMemo(() => ({
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
        gwreFeatures,
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
        aquiferPolygons,
        waterLevelChartData,
        aquiferSpatialFilterApplied,
        aquiferTotalArea,
        aquiferTotalCount,
        aquiferRecords,
        yearlyTrends,
        nearbyData,
        nearbyLoading,

        // Rainfall
        rainfallStats: rainfallStatsData,
        rainfallSummaryData,
        rainfallDistributionData,
        overallDistribution,
        rainfallError,
        rainfallLoading,
        intersectingStationIds,
        yearlyRainfallData,

        // Recharge Structure
        rechargeStats,
        rechargeLoading
    }), [
        analysisLevel, analysisName, displayRegion, displayBlock, neighbor,
        isGWRE, isRainfall, isWaterQuality, isAquifer, isWellInventory, isRechargeStructure, isWaterResources,
        gwreStats, gwreFeatures, gwreLoading, pieData, totalBlocks,
        waterQualityStats, waterQualityAvailability, waterQualityLoading, waterQualityError, qualityData, blockWaterQualityData,
        aquiferStats, aquiferLoading, spatialStatsLoading, aquiferSpatialStats, aquiferData, aquiferPolygons, waterLevelChartData,
        aquiferSpatialFilterApplied, aquiferTotalArea, aquiferTotalCount,
        aquiferRecords, yearlyTrends, nearbyData, nearbyLoading,
        rainfallStatsData, rainfallSummaryData, rainfallDistributionData, overallDistribution, rainfallError, rainfallLoading, intersectingStationIds, yearlyRainfallData,
        rechargeStats, rechargeLoading
    ]);
};
