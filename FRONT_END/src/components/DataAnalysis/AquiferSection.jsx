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
import './AquiferSection.css';

const AquiferSection = ({ displayRegion, displayBlock, data, isExpanded }) => {
    // Process data based on selected region
    const aquiferData = useMemo(() => {
        // Strictly use Database Data passed via props
        if (data && data.length > 0) {
            return data;
        }
        return [];
    }, [data]);

    if (aquiferData.length === 0) {
        return (
            <div className="aquifer-section">
                <AnalysisCard style={{ textAlign: 'center', padding: '3rem', marginTop: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏜️</div>
                    <h3 style={{ color: '#64748b' }}>Data Not Available</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Data is not available. Please select another location.
                    </p>
                </AnalysisCard>
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
                                height: isExpanded ? `${Math.max(400, aquiferData.length * 60)}px` : `${Math.max(220, aquiferData.length * 50)}px`,
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
