import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import { AQUIFER_DATA } from '../../data/districtAquiferData';
import { BLOCK_AQUIFER_DATA } from '../../data/blockAquiferData';
import './AquiferSection.css';

const AquiferSection = ({ displayRegion, displayBlock }) => {
    // Colors for the chart
    const colors = ['#f9c74f', '#90be6d', '#f9844a', '#4d908e', '#277da1', '#577590', '#f3722c'];

    // Process data based on selected region
    const aquiferData = useMemo(() => {
        // Priority 1: Check for Block Data
        if (displayBlock && displayRegion) {
            // Clean district name to title case for matching (e.g. 'AJMER' -> 'Ajmer')
            let cleanDistrict = displayRegion.charAt(0).toUpperCase() + displayRegion.slice(1).toLowerCase();
            // Manual fixes for known mismatches if any
            if (cleanDistrict === 'Ganganagar') cleanDistrict = 'Ganganagar';

            const districtBlocks = BLOCK_AQUIFER_DATA[cleanDistrict];

            if (districtBlocks && districtBlocks[displayBlock]) {
                const blockData = districtBlocks[displayBlock];
                if (blockData.length > 0) {
                    return blockData.map((item, i) => ({
                        ...item,
                        area: item.value.toLocaleString(), // already has value, percent, color
                        color: colors[i % colors.length] // Ensure consistent coloring
                    }));
                }
            }
        }

        // Priority 2: Fallback to District Data
        let filteredAquifers = AQUIFER_DATA;

        if (displayRegion) {
            filteredAquifers = AQUIFER_DATA.filter(aq =>
                aq.districts.some(d => d.toUpperCase() === displayRegion.toUpperCase())
            );
        }

        // Return top 10 by area
        return filteredAquifers
            .sort((a, b) => b.area - a.area)
            .slice(0, 10)
            .map((aq, i) => ({
                name: aq.type,
                value: aq.area,
                area: aq.area.toLocaleString(),
                percent: aq.percent,
                color: colors[i % colors.length]
            }));
    }, [displayRegion, displayBlock]);

    if (aquiferData.length === 0) {
        return (
            <div className="aquifer-section">
                <p style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                    No specific aquifer data available for the selected region.
                </p>
            </div>
        );
    }

    return (
        <div className="aquifer-section">
            <AnalysisCard className="full-width premium-aquifer-card">
                <div className="aquifer-info-content">
                    <div className="aquifer-card-header">
                        <div className="header-accent"></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3>AQUIFERS PRESENT</h3>
                            {displayBlock && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                    {displayBlock} Block Analysis
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="aquifer-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={aquiferData} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={90}
                                    tick={{ fontSize: 10, fontWeight: 500, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" barSize={25} radius={[0, 6, 6, 0]}>
                                    {aquiferData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="aquifer-legend-list">
                        {aquiferData.slice(0, 6).map((aq, i) => (
                            <div key={i} className="aquifer-legend-item">
                                <div className="legend-item-left">
                                    <div className="legend-dot" style={{ backgroundColor: aq.color }}></div>
                                    <span className="aquifer-name">{aq.name}</span>
                                </div>
                                <div className="legend-item-right">
                                    <div className="aquifer-value">
                                        {aq.area} <span className="unit-label">sq km</span>
                                    </div>
                                    <div className="aquifer-percent">
                                        {aq.percent}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AnalysisCard>
        </div>
    );
};

export default AquiferSection;
