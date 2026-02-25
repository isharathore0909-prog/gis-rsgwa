import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';
import ParameterChart from './Common/ParameterChart';
import SmartChartContainer from './Common/SmartChartContainer';

const WaterQualitySection = ({
    displayRegion,
    selectedBlock,
    blockWaterQualityData,
    qualityData,
    waterQualityAvailability,
    isControlsSidebarCollapsed,
    isDatabaseData,
    isLoading
}) => {
    if (isLoading) {
        return (
            <AnalysisCard className="animated-entry">
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        Fetching water quality data...
                    </p>
                </div>
            </AnalysisCard>
        );
    }
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

            {blockWaterQualityData?.isNoData ? null : blockWaterQualityData && !Array.isArray(blockWaterQualityData) ? (
                <>
                    <div className="water-quality-grid" style={{ marginBottom: '1.5rem' }}>
                        {blockWaterQualityData.wqi && (
                            <MiniStatusCard
                                value={blockWaterQualityData.wqi.value}
                                label={`WQI - ${blockWaterQualityData.wqi.classification}`}
                                color={blockWaterQualityData.wqi.value < 100 ? '#2a9d8f' : blockWaterQualityData.wqi.value < 200 ? '#f4a261' : '#e63946'}
                                className="wqi-status-card"
                            />
                        )}
                        {blockWaterQualityData.status && (
                            <MiniStatusCard
                                value={blockWaterQualityData.status.text}
                                label={blockWaterQualityData.status.issues.length > 0
                                    ? blockWaterQualityData.status.issues.join(', ')
                                    : 'All parameters within safe limits'}
                                color={blockWaterQualityData.status.status === 'good' ? '#2a9d8f' : blockWaterQualityData.status.status === 'warning' ? '#f4a261' : '#e63946'}
                                className="wqi-status-card"
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
                                <div className="water-quality-parameter-grid">
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
                                <div className="quality-legend-simple full-width" style={{ marginTop: '1.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
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

                                {waterQualityAvailability && waterQualityAvailability.summary && waterQualityAvailability.summary.total_records > 0 && (
                                    <div className="water-quality-comparison-section full-width" style={{ marginTop: '2rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#475569', fontWeight: 600 }}>
                                            Pre vs Post Monsoon Comparison
                                        </h4>
                                        <SmartChartContainer height="250px">
                                            <BarChart
                                                data={[
                                                    { name: 'pH', pre: waterQualityAvailability.summary.avg_pre_ph, post: waterQualityAvailability.summary.avg_post_ph },
                                                    { name: 'TDS/10', pre: waterQualityAvailability.summary.avg_pre_tds / 10, post: waterQualityAvailability.summary.avg_post_tds / 10 },
                                                    { name: 'Hardness', pre: waterQualityAvailability.summary.avg_pre_hardness, post: waterQualityAvailability.summary.avg_post_hardness },
                                                    { name: 'Alkalinity', pre: waterQualityAvailability.summary.avg_pre_alkalinity, post: waterQualityAvailability.summary.avg_post_alkalinity },
                                                ]}
                                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            const isTds = label === 'TDS/10';
                                                            return (
                                                                <div className="custom-chart-tooltip" style={{ padding: '8px' }}>
                                                                    <p className="tooltip-title" style={{ fontSize: '0.75rem' }}>{isTds ? 'TDS' : label}</p>
                                                                    <p className="tooltip-item" style={{ color: '#f4a261', fontSize: '0.7rem' }}>
                                                                        <strong>Pre:</strong> {isTds ? (payload[0].value * 10).toFixed(1) : payload[0].value.toFixed(1)}
                                                                    </p>
                                                                    <p className="tooltip-item" style={{ color: '#2a9d8f', fontSize: '0.7rem' }}>
                                                                        <strong>Post:</strong> {isTds ? (payload[1].value * 10).toFixed(1) : payload[1].value.toFixed(1)}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="pre" fill="#f4a261" radius={[2, 2, 0, 0]} barSize={15} />
                                                <Bar dataKey="post" fill="#2a9d8f" radius={[2, 2, 0, 0]} barSize={15} />
                                            </BarChart>
                                        </SmartChartContainer>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f4a261' }}></span>
                                                <span style={{ color: '#64748b' }}>Pre</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2a9d8f' }}></span>
                                                <span style={{ color: '#64748b' }}>Post</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
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

                    <AnalysisCard title="District Water Quality Compliance" className="animated-entry full-width" style={{ animationDelay: '0.2s' }}>
                        <SmartChartContainer height="300px" className="bar-chart-wrapper">
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
                        </SmartChartContainer>
                        <div className="quality-legend-simple">
                            <div className="legend-label">% Stations Exceeding Permissible Limits</div>
                        </div>
                    </AnalysisCard>

                    {waterQualityAvailability && waterQualityAvailability.summary && (
                        <AnalysisCard title="Pre vs Post Monsoon Comparison" className="animated-entry full-width" style={{ animationDelay: '0.3s', marginTop: '1.5rem' }}>
                            <SmartChartContainer height="300px" className="bar-chart-wrapper">
                                <BarChart
                                    data={[
                                        { name: 'pH', pre: waterQualityAvailability.summary.avg_pre_ph, post: waterQualityAvailability.summary.avg_post_ph },
                                        { name: 'TDS (mg/l)', pre: waterQualityAvailability.summary.avg_pre_tds / 10, post: waterQualityAvailability.summary.avg_post_tds / 10, original: true }, // Scaling TDS for visibility
                                        { name: 'Hardness', pre: waterQualityAvailability.summary.avg_pre_hardness, post: waterQualityAvailability.summary.avg_post_hardness },
                                        { name: 'Alkalinity', pre: waterQualityAvailability.summary.avg_pre_alkalinity, post: waterQualityAvailability.summary.avg_post_alkalinity },
                                    ]}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const isTds = label.includes('TDS');
                                                return (
                                                    <div className="custom-chart-tooltip">
                                                        <p className="tooltip-title">{label}</p>
                                                        <p className="tooltip-item" style={{ color: '#f4a261' }}>
                                                            <strong>Pre:</strong> {isTds ? (payload[0].value * 10).toFixed(1) : payload[0].value.toFixed(1)}
                                                        </p>
                                                        <p className="tooltip-item" style={{ color: '#2a9d8f' }}>
                                                            <strong>Post:</strong> {isTds ? (payload[1].value * 10).toFixed(1) : payload[1].value.toFixed(1)}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="pre" name="Pre-Monsoon" fill="#f4a261" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="post" name="Post-Monsoon" fill="#2a9d8f" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </SmartChartContainer>
                            <div className="quality-legend-simple">
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f4a261' }}></span>
                                        <span>Pre-Monsoon</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a9d8f' }}></span>
                                        <span>Post-Monsoon</span>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'center' }}>
                                    * TDS values are scaled (÷10) for comparison visibility
                                </p>
                            </div>
                        </AnalysisCard>
                    )}
                </>
            )}
        </>
    );
};

export default WaterQualitySection;
