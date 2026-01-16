import React from 'react';

// Styles
import './DataAnalysisSidebar.css';

// Sub-components
import AnalysisHeader from './DataAnalysis/AnalysisHeader';
import RainfallSection from './DataAnalysis/RainfallSection';
import WaterQualitySection from './DataAnalysis/WaterQualitySection';
import GroundWaterSection from './DataAnalysis/GroundWaterSection';
import AquiferSection from './DataAnalysis/AquiferSection';
import WellInventorySection from './DataAnalysis/WellInventorySection';
import RechargeStructureSection from './DataAnalysis/RechargeStructureSection';

// Hooks
import { useDataAnalysis } from '../hooks/useDataAnalysis';

// Utils
import { getParameterColor } from '../data/blockWaterQualityData';

/**
 * DataAnalysisSidebar Component
 * 
 * Manages the right sidebar for data analysis across different layers.
 * Logic is delegated to the useDataAnalysis hook.
 */
const DataAnalysisSidebar = ({
    clickedLocation,
    neighbors,
    filters: globalFilters,
    blockData,
    rainfallPoints = [],
    isControlsSidebarCollapsed,
    selectedWellInventory = [],
    onToggleWellInventory,
    onClearWellInventory,
    onSetWellInventory
}) => {
    // Delegate data processing to the hook
    const {
        isGWRE, isRainfall, isWaterQuality, isAquifer, isWellInventory, isRechargeStructure,
        displayRegion, displayBlock, analysisLevel, analysisName, neighbor,
        pieData, totalBlocks, waterLevelChartData,
        qualityData, blockWaterQualityData, waterQualityLoading, waterQualityStats,
        aquiferData, aquiferLoading,
        rainfallStats, rainfallSummaryData, rainfallLoading,
        rechargeStats, rechargeLoading
    } = useDataAnalysis({
        globalFilters,
        clickedLocation,
        neighbors,
        blockData,
        rainfallPoints
    });

    return (
        <aside
            className={`data-analysis-sidebar ${isControlsSidebarCollapsed ? 'expanded-layout' : ''}`}
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
                    />
                )}

                {isAquifer && (
                    <AquiferSection
                        displayRegion={displayRegion}
                        displayBlock={displayBlock}
                        data={aquiferData}
                        isLoading={aquiferLoading}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}

                {isWellInventory && (
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
                    />
                )}
            </div>
        </aside>
    );
};

export default DataAnalysisSidebar;
