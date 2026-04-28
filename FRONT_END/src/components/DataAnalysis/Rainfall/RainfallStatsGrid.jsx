import React from 'react';
import MiniStatusCard from '../Common/MiniStatusCard';

const RainfallStatsGrid = ({ rainfallStats, computedAverage }) => {
    return (
        <>
            <div className="status-summary-grid">
                <MiniStatusCard
                    value={`${computedAverage.toFixed(2)} mm`}
                    label="Average Rainfall"
                    color="#2a9d8f"
                />
                <MiniStatusCard value={`${Number(rainfallStats?.monsoon_avg ?? 0).toFixed(2)} mm`} label="Monsoon Avg" color="#3b82f6" />
                <MiniStatusCard value={`${Number(rainfallStats?.non_monsoon_avg ?? 0).toFixed(2)} mm`} label="Non-Monsoon Avg" color="#f4a261" />
                <MiniStatusCard value={`${rainfallStats?.count ?? 0}`} label="Total Records" color="#6366f1" />
            </div>
            <div className="status-summary-grid" style={{ marginTop: '0.5rem' }}>
                <MiniStatusCard value={`${Number(rainfallStats?.avg ?? 0).toFixed(2)} mm`} label="Avg Reading" color="#457b9d" />
                <MiniStatusCard value={`${Number(rainfallStats?.max ?? 0).toFixed(2)} mm`} label="Highest Record" color="#94a3b8" />
            </div>
        </>
    );
};

export default React.memo(RainfallStatsGrid);
