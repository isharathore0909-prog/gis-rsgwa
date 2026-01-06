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
        if (!displayRegion) return [];

        // Helper to normalize names for comparison
        const normalize = (name) => {
            if (!name) return "";
            return name.split(' (')[0].trim().toUpperCase();
        };

        const targetNorm = normalize(displayRegion);

        // Priority 1: Check for Block Data
        if (displayBlock) {
            // Find district key in BLOCK_AQUIFER_DATA by normalized match
            const districtKey = Object.keys(BLOCK_AQUIFER_DATA).find(key => normalize(key) === targetNorm);

            if (districtKey) {
                const districtBlocks = BLOCK_AQUIFER_DATA[districtKey];
                if (districtBlocks && districtBlocks[displayBlock]) {
                    const blockData = districtBlocks[displayBlock];
                    if (blockData.length > 0) {
                        return blockData.map((item, i) => ({
                            ...item,
                            area: item.value.toLocaleString(),
                            color: item.color || colors[i % colors.length]
                        }));
                    }
                }
            }
        }

        // Priority 2: Fallback to District Data
        const filteredAquifers = AQUIFER_DATA.filter(aq =>
            aq.districts.some(d => normalize(d) === targetNorm)
        );

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

                    <div className="aquifer-chart-wrapper" style={{ width: '100%', overflow: 'hidden' }}>
                        <div
                            className="aquifer-chart-container"
                            style={{
                                height: `${Math.max(220, aquiferData.length * 50)}px`,
                                width: '100%',
                                position: 'relative'
                            }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={aquiferData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide domain={[0, 'dataMax + 1000']} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={110}
                                        tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc', opacity: 0.4 }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        fill="#3b82f6"
                                        barSize={20}
                                        minPointSize={2}
                                    >
                                        {aquiferData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="aquifer-legend-list">
                        <div style={{ borderTop: '1px solid #f1f5f9', margin: '1rem 0' }}></div>
                        {aquiferData.map((aq, i) => (
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
