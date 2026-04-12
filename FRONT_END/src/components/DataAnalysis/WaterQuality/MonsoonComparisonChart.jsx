import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import SmartChartContainer from '../Common/SmartChartContainer';

const MonsoonComparisonChart = ({ summary, isOverview = false }) => {
    if (!summary || (summary.total_records === 0 && !isOverview)) return null;

    const data = [
        { name: 'pH', pre: summary.avg_pre_ph, post: summary.avg_post_ph },
        { name: isOverview ? 'TDS (mg/l)' : 'TDS/10', pre: summary.avg_pre_tds / 10, post: summary.avg_post_tds / 10 },
        { name: 'Hardness', pre: summary.avg_pre_hardness, post: summary.avg_post_hardness },
        { name: 'Alkalinity', pre: summary.avg_pre_alkalinity, post: summary.avg_post_alkalinity },
    ];

    return (
        <div className={`water-quality-comparison-section full-width ${isOverview ? 'animated-entry' : ''}`} style={isOverview ? { marginTop: '1.5rem' } : { marginTop: '2rem' }}>
            {!isOverview && (
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#475569', fontWeight: 600 }}>
                    Pre vs Post Monsoon Comparison
                </h4>
            )}
            <SmartChartContainer height={isOverview ? "300px" : "250px"} className={isOverview ? "bar-chart-wrapper" : ""}>
                <BarChart
                    data={data}
                    margin={isOverview ? { top: 20, right: 36, left: 20, bottom: 5 } : { top: 10, right: 35, left: -20, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: isOverview ? 11 : 10 }} />
                    <YAxis tick={{ fontSize: isOverview ? 11 : 10 }} />
                    <Tooltip
                        allowEscapeViewBox={{ x: false, y: true }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const isTds = label.includes('TDS');
                                return (
                                    <div className="custom-chart-tooltip" style={!isOverview ? { padding: '8px' } : undefined}>
                                        <p className="tooltip-title" style={!isOverview ? { fontSize: '0.75rem' } : undefined}>
                                            {isTds && !isOverview ? 'TDS' : label}
                                        </p>
                                        <p className="tooltip-item" style={{ color: '#f4a261', fontSize: !isOverview ? '0.7rem' : undefined }}>
                                            <strong>Pre:</strong> {isTds ? (payload[0].value * 10).toFixed(1) : payload[0].value.toFixed(1)}
                                        </p>
                                        <p className="tooltip-item" style={{ color: '#2a9d8f', fontSize: !isOverview ? '0.7rem' : undefined }}>
                                            <strong>Post:</strong> {isTds ? (payload[1].value * 10).toFixed(1) : payload[1].value.toFixed(1)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="pre" name="Pre-Monsoon" fill="#f4a261" radius={isOverview ? [4, 4, 0, 0] : [2, 2, 0, 0]} barSize={isOverview ? undefined : 15} />
                    <Bar dataKey="post" name="Post-Monsoon" fill="#2a9d8f" radius={isOverview ? [4, 4, 0, 0] : [2, 2, 0, 0]} barSize={isOverview ? undefined : 15} />
                </BarChart>
            </SmartChartContainer>

            <div className="quality-legend-simple">
                <div style={{ display: 'flex', justifyContent: 'center', gap: isOverview ? '1.5rem' : '1rem', fontSize: isOverview ? '0.75rem' : '0.7rem', color: '#64748b', marginTop: isOverview ? 0 : '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isOverview ? '6px' : '4px' }}>
                        <span style={{ width: isOverview ? '10px' : '8px', height: isOverview ? '10px' : '8px', borderRadius: '50%', background: '#f4a261' }}></span>
                        <span>{isOverview ? 'Pre-Monsoon' : 'Pre'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isOverview ? '6px' : '4px' }}>
                        <span style={{ width: isOverview ? '10px' : '8px', height: isOverview ? '10px' : '8px', borderRadius: '50%', background: '#2a9d8f' }}></span>
                        <span>{isOverview ? 'Post-Monsoon' : 'Post'}</span>
                    </div>
                </div>
                {isOverview && (
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'center' }}>
                        * TDS values are scaled (÷10) for comparison visibility
                    </p>
                )}
            </div>
        </div>
    );
};

export default MonsoonComparisonChart;
