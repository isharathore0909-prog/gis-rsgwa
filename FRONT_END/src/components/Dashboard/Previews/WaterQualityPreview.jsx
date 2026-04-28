import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';

const WaterQualityPreview = ({ analysisResults, metricColor }) => {
    if (!analysisResults?.qualityData || analysisResults.qualityData.length === 0) return null;

    return (
        <div style={{
            width: '100%',
            height: '360px',
            background: 'white',
            borderRadius: '12px',
            padding: '0px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius={100} data={analysisResults.qualityData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Radar
                            name="Exceedance %"
                            dataKey="value"
                            stroke={metricColor}
                            fill={metricColor}
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            {analysisResults?.waterQualityStats?.summary && (
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '10px 0',
                    background: 'var(--primary-light)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    marginBottom: '6px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Samples</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--primary-dark)', fontWeight: '800' }}>
                            {analysisResults.waterQualityStats.summary.total_records || '---'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Safe Samples</div>
                        <div style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '800' }}>
                            {Math.max(0, (analysisResults.waterQualityStats.summary.total_records || 0) - (analysisResults.waterQualityStats.summary.overall_exceedance || 0))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Health Index</div>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '800',
                            color: (100 - (analysisResults.waterQualityStats.wqi || 0)) > 70 ? '#059669' : '#d97706'
                        }}>
                            {Math.round(100 - (Number(analysisResults.waterQualityStats.wqi) || 0)) || 0}%
                        </div>
                    </div>
                </div>
            )}
            <div className="safe-limits-legend" style={{
                padding: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '9px',
                fontWeight: '600',
                color: '#64748b',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px'
            }}>
                <span style={{ color: 'var(--primary-dark)', width: '100%', textAlign: 'center', marginBottom: '2px', fontSize: '10px' }}>Permissible Limits (Safe)</span>
                <span style={{ padding: '1px 6px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>pH: 6.5-8.5</span>
                <span style={{ padding: '1px 6px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>EC: 3000</span>
                <span style={{ padding: '1px 6px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>F: 1.5</span>
                <span style={{ padding: '1px 6px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>NO3: 45</span>
                <span style={{ padding: '1px 6px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>TDS: 2000</span>
            </div>
        </div>
    );
};

export default WaterQualityPreview;
