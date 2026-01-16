import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';
import ParameterChart from './Common/ParameterChart';

const WaterQualitySection = ({
    displayRegion,
    selectedBlock,
    blockWaterQualityData,
    qualityData,
    isControlsSidebarCollapsed,
    isDatabaseData
}) => {
    if (!displayRegion) {
        return (
            <AnalysisCard className="animated-entry">
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Select a District</h3>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        Choose a district from the dropdown or click on the map to view water quality analysis
                    </p>
                </div>
            </AnalysisCard>
        );
    }

    return (
        <>
            <div className="sidebar-section animated-entry">
                <div className="section-header-flat">
                    <h3>
                        Water Quality Analysis: {displayRegion}
                        {selectedBlock && ` - ${selectedBlock}`}
                    </h3>
                    {isDatabaseData !== undefined && (
                        <span className={`source-badge ${isDatabaseData ? 'db-source' : 'static-source'}`}>
                            {isDatabaseData ? 'Database' : 'Static Data'}
                        </span>
                    )}
                </div>
            </div>

            {blockWaterQualityData?.isNoData ? (
                <div className="sidebar-section animated-entry">
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📉</div>
                        <h3 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>Data Not Available</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Data is not available. Please select another location.
                        </p>
                    </div>
                </div>
            ) : blockWaterQualityData && !Array.isArray(blockWaterQualityData) ? (
                <>
                    <div className="water-quality-grid" style={{ marginBottom: '1.5rem' }}>
                        {blockWaterQualityData.wqi && (
                            <MiniStatusCard
                                value={blockWaterQualityData.wqi.value}
                                label={`WQI - ${blockWaterQualityData.wqi.classification}`}
                                color={blockWaterQualityData.wqi.value < 100 ? '#2a9d8f' : blockWaterQualityData.wqi.value < 200 ? '#f4a261' : '#e63946'}
                                style={{
                                    background: 'white',
                                    padding: '1.5rem',
                                    gridColumn: isControlsSidebarCollapsed ? 'span 1' : '1 / -1',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            />
                        )}
                        {blockWaterQualityData.status && (
                            <MiniStatusCard
                                value={blockWaterQualityData.status.text}
                                label={blockWaterQualityData.status.issues.length > 0
                                    ? blockWaterQualityData.status.issues.join(', ')
                                    : 'All parameters within safe limits'}
                                color={blockWaterQualityData.status.status === 'good' ? '#2a9d8f' : blockWaterQualityData.status.status === 'warning' ? '#f4a261' : '#e63946'}
                                style={{
                                    background: 'white',
                                    padding: '1.5rem',
                                    gridColumn: isControlsSidebarCollapsed ? 'span 1' : '1 / -1',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            />
                        )}
                    </div>

                    {(() => {
                        const params = [
                            { key: 'ec', name: 'EC', limit: 3000, unit: 'µS/cm' },
                            { key: 'fluoride', name: 'Fluoride', limit: 1.5, unit: 'mg/l' },
                            { key: 'nitrate', name: 'Nitrate', limit: 45, unit: 'mg/l' },
                            { key: 'iron', name: 'Iron', limit: 1.0, unit: 'mg/l' },
                            { key: 'arsenic', name: 'Arsenic', limit: 10, unit: 'µg/l' },
                            { key: 'uranium', name: 'Uranium', limit: 30, unit: 'µg/l' },
                            { key: 'tds', name: 'TDS', limit: 2000, unit: 'mg/l' },
                            { key: 'ph', name: 'pH', limit: 8.5, unit: '', range: [6.5, 8.5] },
                            { key: 'chloride', name: 'Chloride', limit: 1000, unit: 'mg/l' },
                            { key: 'hardness', name: 'Hardness', limit: 600, unit: 'mg/l' }
                        ];

                        const visibleParams = params.filter(p => {
                            const val = blockWaterQualityData[p.key];
                            return val !== undefined && val !== null && val !== 0;
                        });

                        if (visibleParams.length === 0) {
                            return (
                                <div className="no-data-message" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#64748b',
                                    gridColumn: '1 / -1',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px dashed #cbd5e1'
                                }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No specific parameter data recorded for this location.</p>
                                </div>
                            );
                        }

                        return (
                            <>
                                <div className="water-quality-grid">
                                    {visibleParams.map(param => {
                                        const value = blockWaterQualityData[param.key];
                                        let status;
                                        if (param.key === 'ph') {
                                            status = (value >= param.range[0] && value <= param.range[1]) ? 'Normal' : 'Out Range';
                                        } else {
                                            status = value > param.limit ? 'High' : 'Safe';
                                        }

                                        return (
                                            <ParameterChart
                                                key={param.key}
                                                name={param.name}
                                                value={value}
                                                limit={param.limit}
                                                unit={param.unit}
                                                status={status}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="quality-legend-simple" style={{ marginTop: '1.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a9d8f' }}></span>
                                            <span>Safe / Normal</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                                            <span>High / Out of Range</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </>
            ) : (
                <>
                    <AnalysisCard className="animated-entry" style={{ animationDelay: '0.1s' }}>
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💧</div>
                            <h3 style={{ marginBottom: '0.5rem' }}>Select a Block/Taluka</h3>
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                Choose a specific block from the dropdown to view detailed water quality parameters
                            </p>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="District Water Quality Compliance" className="animated-entry" style={{ animationDelay: '0.2s' }}>
                        <div className="bar-chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={qualityData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis
                                        dataKey="subject"
                                        type="category"
                                        width={70}
                                        tick={{ fontSize: 11, fontWeight: 500 }}
                                    />
                                    <Tooltip
                                        allowEscapeViewBox={{ x: true, y: true }}
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="custom-chart-tooltip">
                                                        <p className="tooltip-title">{data.subject}</p>
                                                        <p className="tooltip-item"><strong>Limit:</strong> {data.label}</p>
                                                        <p className="tooltip-item"><strong>Exceedance:</strong> {data.value}% Stations</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#f4a261" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="quality-legend-simple">
                            <div className="legend-label">% Stations Exceeding Permissible Limits</div>
                        </div>
                    </AnalysisCard>
                </>
            )}
        </>
    );
};

export default WaterQualitySection;
