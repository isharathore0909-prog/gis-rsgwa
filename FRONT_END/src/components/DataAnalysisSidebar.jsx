import React from 'react';
import './DataAnalysisSidebar.css';

// Sub-components
import AnalysisHeader from './DataAnalysis/AnalysisHeader';
import RainfallSection from './DataAnalysis/RainfallSection';
import WaterQualitySection from './DataAnalysis/WaterQualitySection';
import GroundWaterSection from './DataAnalysis/GroundWaterSection';
import AquiferSection from './DataAnalysis/AquiferSection';
import WellInventorySection from './DataAnalysis/WellInventorySection';
import RechargeStructureSection from './DataAnalysis/RechargeStructureSection';

// Hooks & Context
import { useDataAnalysis } from '../hooks/useDataAnalysis';
import { useAppContext } from '../context/AppContext';

// Utils
import { getParameterColor } from '../data/blockWaterQualityData';

/**
 * DataAnalysisSidebar Component
 * 
 * Manages the right sidebar for data analysis across different layers.
 * Logic is delegated to the useDataAnalysis hook and AppContext.
 */
const DataAnalysisSidebar = ({
    neighbors,
    blockData,
    rainfallPoints = [],
    selectedWellInventory = [],
    onToggleWellInventory,
    onClearWellInventory,
    onSetWellInventory,
    rainfallStations = [],
    rainfallStationRecords = [],
    rainfallLoading: parentRainfallLoading,
    waterQualityLoading: parentWaterQualityLoading,
    aquiferLoading: parentAquiferLoading,
    rechargeLoading: parentRechargeLoading,
    className = ''
}) => {
    const {
        filters: globalFilters,
        clickedLocation,
        isControlsSidebarCollapsed
    } = useAppContext();

    // Delegate data processing to the hook
    const {
        isGWRE, isRainfall, isWaterQuality, isAquifer, isWellInventory, isRechargeStructure,
        displayRegion, displayBlock, analysisLevel, analysisName, neighbor,
        pieData, totalBlocks, waterLevelChartData,
        qualityData, blockWaterQualityData, waterQualityLoading, waterQualityStats, waterQualityAvailability,
        aquiferData, aquiferLoading,
        aquiferSpatialFilterApplied, aquiferTotalArea, aquiferTotalCount,
        rainfallStats, rainfallSummaryData, rainfallLoading,
        rechargeStats, rechargeLoading
    } = useDataAnalysis({
        globalFilters,
        clickedLocation,
        neighbors,
        blockData,
        rainfallPoints,
        rainfallStations,
        rainfallStationRecords,
        parentRainfallLoading,
        parentWaterQualityLoading,
        parentAquiferLoading,
        parentRechargeLoading
    });

    return (
        <aside
            className={`data-analysis-sidebar ${isControlsSidebarCollapsed ? 'expanded-layout' : ''} ${className}`}
            data-expanded={isControlsSidebarCollapsed}
        >
            <div className="sidebar-content">
                <AnalysisHeader
                    displayRegion={analysisName}
                    analysisLevel={analysisLevel}
                    isRainfall={isRainfall}
                    selectedLayer={globalFilters?.type}
                />

                {isRainfall && (
                    <RainfallSection
                        displayRegion={analysisName}
                        analysisLevel={analysisLevel}
                        rainfallStats={rainfallStats}
                        rainfallPoints={rainfallSummaryData}
                        viewType={globalFilters?.timestep}
                        isLoading={rainfallLoading}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}

                {isWaterQuality && (
                    <WaterQualitySection
                        displayRegion={displayRegion || 'Rajasthan'}
                        selectedBlock={displayBlock}
                        blockWaterQualityData={blockWaterQualityData}
                        qualityData={qualityData}
                        isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                        isDatabaseData={waterQualityStats?.total_records > 0}
                        waterQualityAvailability={waterQualityAvailability}
                        isLoading={waterQualityLoading}
                    />
                )}

                {isRechargeStructure && (
                    <RechargeStructureSection
                        displayRegion={analysisName}
                        displayBlock={displayBlock}
                        stats={rechargeStats}
                        isLoading={rechargeLoading}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}

                {(isGWRE || (!isRainfall && !isWaterQuality && !isAquifer && !isWellInventory && !isRechargeStructure)) && (
                    <GroundWaterSection
                        isGWRE={isGWRE}
                        pieData={pieData}
                        totalBlocks={totalBlocks}
                        waterLevelChartData={waterLevelChartData}
                        aquiferData={aquiferData}
                        qualityData={qualityData}
                        blockWaterQualityData={blockWaterQualityData}
                        getParameterColor={getParameterColor}
                        isExpanded={isControlsSidebarCollapsed}
                        isLoading={aquiferLoading}
                    />
                )}

                {isAquifer && (
                    <AquiferSection
                        displayRegion={displayRegion}
                        displayBlock={displayBlock}
                        data={aquiferData}
                        isLoading={aquiferLoading}
                        isExpanded={isControlsSidebarCollapsed}
                        spatialFilterApplied={aquiferSpatialFilterApplied}
                        totalArea={aquiferTotalArea}
                        totalCount={aquiferTotalCount}
                    />
                )}

                {isWellInventory && (
                    <>
                        <WellInventorySection
                            displayRegion={displayRegion}
                            displayBlock={displayBlock}
                            analysisLevel={analysisLevel}
                            globalFilters={globalFilters}
                            selectedWell={neighbor?.type === 'well_inventory_well' ? neighbor : null}
                            selectedFeature={neighbor}
                            clickedLocation={clickedLocation}
                            isExpanded={isControlsSidebarCollapsed}
                            selectedWellInventory={selectedWellInventory}
                            onToggleWellInventory={onToggleWellInventory}
                            onClearWellInventory={onClearWellInventory}
                            onSetWellInventory={onSetWellInventory}
                            rainfallStations={rainfallStations}
                        />
                        <AquiferSection
                            displayRegion={displayRegion}
                            displayBlock={displayBlock}
                            data={aquiferData}
                            isLoading={aquiferLoading}
                            isExpanded={isControlsSidebarCollapsed}
                            spatialFilterApplied={aquiferSpatialFilterApplied}
                            totalArea={aquiferTotalArea}
                            totalCount={aquiferTotalCount}
                        />
                    </>
                )}
            </div>
        </aside>
    );
};

export default DataAnalysisSidebar;
