import React from 'react';
import HydrographChart from './HydrographChart';
import WaterLevelChart from './WaterLevelChart';
import HydrographDataTable from './HydrographDataTable';
import { WellSelectionTable } from './WellSelectionTable';

export const RegionalTrendCard = ({
    aggregatedChartData,
    analysisLevel,
    isExpanded,
    totalWells,
    listDataLength,
    selectedWellInventory,
    onToggleWellInventory,
    onClearWellInventory
}) => {
    return (
        <div className="well-inventory-section overview animated-entry">
            <div className="card-header">
                <div className="title-group">
                    <h5>Regional Water Level Trend</h5>
                    <span>Based on {totalWells || listDataLength} observation wells</span>
                </div>
            </div>
            {(analysisLevel === 'Village' || analysisLevel === 'Gram Panchayat') ? (
                <HydrographChart data={aggregatedChartData} isExpanded={isExpanded} />
            ) : (
                <WaterLevelChart data={aggregatedChartData} isExpanded={isExpanded} />
            )}
            <HydrographDataTable
                data={aggregatedChartData}
                showRainfall={analysisLevel === 'Village' || analysisLevel === 'Gram Panchayat'}
            />

            <WellSelectionTable
                selectedWellInventory={selectedWellInventory}
                onToggleWellInventory={onToggleWellInventory}
                onClearWellInventory={onClearWellInventory}
            />
        </div>
    );
};
