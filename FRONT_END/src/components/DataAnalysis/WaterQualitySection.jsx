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
                        <h3 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>Data is not present</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Water quality monitoring data is currently unavailable for <strong>{blockWaterQualityData.block}</strong> block.
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
                                    gridColumn: isControlsSidebarCollapsed ? 'span 2' : '1 / -1',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            />
                        )}
                    </div>

                    <div className="water-quality-grid">
                        <ParameterChart name="EC" value={blockWaterQualityData.ec} limit={3000} unit="µS/cm" status={blockWaterQualityData.ec > 3000 ? 'High' : 'Safe'} />
                        <ParameterChart name="Fluoride" value={blockWaterQualityData.fluoride} limit={1.5} unit="mg/l" status={blockWaterQualityData.fluoride > 1.5 ? 'High' : 'Safe'} />
                        <ParameterChart name="Nitrate" value={blockWaterQualityData.nitrate} limit={45} unit="mg/l" status={blockWaterQualityData.nitrate > 45 ? 'High' : 'Safe'} />
                        <ParameterChart name="Iron" value={blockWaterQualityData.iron} limit={1.0} unit="mg/l" status={blockWaterQualityData.iron > 1.0 ? 'High' : 'Safe'} />
                        <ParameterChart name="Arsenic" value={blockWaterQualityData.arsenic} limit={10} unit="µg/l" status={blockWaterQualityData.arsenic > 10 ? 'High' : 'Safe'} />
                        <ParameterChart name="Uranium" value={blockWaterQualityData.uranium} limit={30} unit="µg/l" status={blockWaterQualityData.uranium > 30 ? 'High' : 'Safe'} />
                        <ParameterChart name="TDS" value={blockWaterQualityData.tds} limit={2000} unit="mg/l" status={blockWaterQualityData.tds > 2000 ? 'High' : 'Safe'} />
                        <ParameterChart name="pH" value={blockWaterQualityData.ph} limit={8.5} status={(blockWaterQualityData.ph >= 6.5 && blockWaterQualityData.ph <= 8.5) ? 'Normal' : 'Out Range'} />
                        <ParameterChart name="Chloride" value={blockWaterQualityData.chloride} limit={1000} unit="mg/l" status={blockWaterQualityData.chloride > 1000 ? 'High' : 'Safe'} />
                        <ParameterChart name="Hardness" value={blockWaterQualityData.hardness} limit={600} unit="mg/l" status={blockWaterQualityData.hardness > 600 ? 'High' : 'Safe'} />
                    </div>
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
