import React from 'react';
import HydrographChart from './HydrographChart';
import HydrographDataTable from './HydrographDataTable';
import { WellSelectionTable } from './WellSelectionTable';

export const WellProfileCard = ({
    selectedWell,
    rainfallData,
    isExpanded,
    selectedWellInventory,
    onToggleWellInventory,
    onClearWellInventory
}) => {
    const chartData = Array.from({ length: 10 }, (_, i) => 2015 + i).map(year => {
        const pre = selectedWell[`pre_${year}`];
        const pst = selectedWell[`pst_${year}`];
        const preVal = (pre != null && pre !== '') ? parseFloat(pre) : null;
        const pstVal = (pst != null && pst !== '') ? parseFloat(pst) : null;

        let avg = null;
        if (preVal !== null && pstVal !== null) avg = (preVal + pstVal) / 2;
        else if (preVal !== null) avg = preVal;
        else if (pstVal !== null) avg = pstVal;

        return {
            year: year.toString(),
            'Pre-Monsoon': preVal,
            'Post-Monsoon': pstVal,
            'Average Water Level': avg ? avg.toFixed(2) : null,
            'Annual Rainfall': rainfallData[year.toString()] ? rainfallData[year.toString()] / 1000 : null
        };
    });

    return (
        <div className="well-inventory-section detailed-view animated-entry">
            <div className="well-profile-card">
                <div className="profile-header">
                    <div className="profile-icon">📍</div>
                    <div className="profile-info">
                        <h4>{selectedWell.well_id || 'Well Details'}</h4>
                        <p>{selectedWell.village_name || selectedWell.village || 'Location Selected'}</p>
                    </div>
                </div>
                <div className="profile-stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">Aquifer</span>
                        <span className="stat-value">{selectedWell.aquifer || 'N/A'}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Water Level Avg</span>
                        <span className="stat-value">
                            {chartData.filter(d => d['Average Water Level']).length > 0
                                ? (chartData.reduce((acc, curr) => acc + parseFloat(curr['Average Water Level'] || 0), 0) /
                                    chartData.filter(d => d['Average Water Level']).length).toFixed(1)
                                : 'N/A'} m
                        </span>
                    </div>
                </div>

                <div className="chart-section-title">Hydrograph & Rainfall Correlation</div>
                <HydrographChart data={chartData} isExpanded={isExpanded} />
                <HydrographDataTable data={chartData} />
            </div>

            <WellSelectionTable
                selectedWellInventory={selectedWellInventory}
                onToggleWellInventory={onToggleWellInventory}
                onClearWellInventory={onClearWellInventory}
            />
        </div>
    );
};
