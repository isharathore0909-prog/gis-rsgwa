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
import SmartChartContainer from './Common/SmartChartContainer';
import './AquiferSection.css';

// Custom tooltip for the aquifer bar chart
const AquiferTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                fontSize: '0.82rem',
                minWidth: '160px'
            }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{d.name}</div>
                {d.area > 0 && (
                    <div style={{ color: '#475569' }}>
                        Area: <strong>{d.area.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²</strong>
                    </div>
                )}
                {d.count > 0 && (
                    <div style={{ color: '#475569' }}>
                        Features: <strong>{d.count}</strong>
                    </div>
                )}
                <div style={{ color: '#64748b', marginTop: 4 }}>
                    Share: <strong style={{ color: payload[0].fill }}>{Number(d.percent).toFixed(1)}%</strong>
                </div>
            </div>
        );
    }
    return null;
};

const AquiferSection = ({ displayRegion, displayBlock, data, isLoading, isExpanded, spatialFilterApplied, totalArea, totalCount }) => {
    // Process data based on selected region
    const aquiferData = useMemo(() => {
        if (data && data.length > 0) {
            return data;
        }
        return [];
    }, [data]);

    if (isLoading) {
        return (
            <div className="aquifer-section">
                <AnalysisCard style={{ textAlign: 'center', padding: '3rem', marginTop: '1rem' }}>
                    <div className="aq-spinner-wrap">
                        <div className="aq-spinner"></div>
                        <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>Loading Aquifer Data...</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                            Spatially intersecting aquifer layer with selected boundary...
                        </p>
                    </div>
                </AnalysisCard>
            </div>
        );
    }

    if (aquiferData.length === 0) {
        return (
            <div className="aquifer-section">
                <AnalysisCard style={{ textAlign: 'center', padding: '2rem 1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <h3 style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                            No Aquifer Data Found
                        </h3>
                        <p style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: 0, maxWidth: '200px' }}>
                            {displayRegion
                                ? `No aquifer polygons found for ${displayBlock ? `${displayBlock} block, ` : ''}${displayRegion} district.`
                                : 'Select a district to view aquifer distribution.'
                            }
                        </p>
                    </div>
                </AnalysisCard>
            </div>
        );
    }

    const hasArea = aquiferData.some(d => d.area > 0);
    const computedArea = aquiferData.reduce((s, d) => s + (d.area || 0), 0);
    const computedCount = aquiferData.reduce((s, d) => s + (d.count || 0), 0);
    const displayTotal = hasArea
        ? `${(totalArea || computedArea).toLocaleString(undefined, { maximumFractionDigits: 0 })} km²`
        : `${totalCount || computedCount} features`;

    const contextLabel = displayBlock
        ? `${displayBlock} Block`
        : displayRegion
            ? `${displayRegion} District`
            : 'Rajasthan (State)';

    return (
        <div className="aquifer-section">
            <AnalysisCard className="full-width premium-aquifer-card">
                <div className="aquifer-info-content">
                    {/* ─── Header ─── */}
                    <div className="aquifer-card-header">
                        <div className="header-accent"></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h3>AQUIFERS PRESENT</h3>
                                {spatialFilterApplied && (
                                    <span className="aq-spatial-badge">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                                        </svg>
                                        Spatially Intersected
                                    </span>
                                )}
                            </div>
                            <span className="aq-context-label">{contextLabel}</span>
                        </div>
                    </div>

                    {/* ─── Summary Stats Row ─── */}
                    <div className="aq-summary-row">
                        <div className="aq-stat-chip">
                            <span className="aq-stat-value">{aquiferData.length}</span>
                            <span className="aq-stat-label">Aquifer Types</span>
                        </div>
                        <div className="aq-stat-chip aq-stat-chip--accent">
                            <span className="aq-stat-value">{displayTotal}</span>
                            <span className="aq-stat-label">{hasArea ? 'Total Area' : 'Total Features'}</span>
                        </div>
                        <div className="aq-stat-chip">
                            <span className="aq-stat-value">{aquiferData[0]?.name?.split(' ').slice(0, 2).join(' ')}</span>
                            <span className="aq-stat-label">Dominant Type</span>
                        </div>
                    </div>

                    {/* ─── Bar Chart ─── */}
                    <div className="aquifer-chart-wrapper" style={{ width: '100%' }}>
                        <SmartChartContainer
                            height={isExpanded
                                ? `${Math.max(400, aquiferData.length * 60)}px`
                                : `${Math.max(220, aquiferData.length * 50)}px`}
                            className="aquifer-chart-container"
                        >
                            <BarChart
                                data={aquiferData}
                                layout="vertical"
                                margin={{ top: 10, right: 50, left: 0, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide domain={[0, 'dataMax']} dataKey="percent" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={110}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                />
                                <Tooltip allowEscapeViewBox={{ y: true }} content={<AquiferTooltip />} />
                                <Bar
                                    dataKey="percent"
                                    fill="#3b82f6"
                                    barSize={22}
                                    radius={[0, 6, 6, 0]}
                                    minPointSize={2}
                                    label={{
                                        position: 'right',
                                        formatter: (v) => `${Number(v).toFixed(1)}%`,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        fill: '#64748b'
                                    }}
                                >
                                    {aquiferData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SmartChartContainer>
                    </div>

                    {/* ─── Detail List ─── */}
                    <div className="aquifer-legend-list">
                        <div className="aq-list-header">
                            <span>Aquifer Type</span>
                            <span style={{ marginLeft: 'auto', marginRight: '1rem' }}>{hasArea ? 'Area (km²)' : 'Count'}</span>
                            <span>Share</span>
                        </div>
                        {aquiferData.map((aq, i) => (
                            <div key={i} className="aquifer-legend-item">
                                <div className="legend-item-left">
                                    <div className="legend-dot" style={{ backgroundColor: aq.color }}></div>
                                    <div>
                                        <span className="aquifer-name">{aq.name}</span>
                                        {aq.count > 0 && (
                                            <span className="aq-feature-count">{aq.count} feature{aq.count !== 1 ? 's' : ''}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="legend-item-right">
                                    <div className="aquifer-value">
                                        {hasArea
                                            ? aq.area > 0
                                                ? aq.area.toLocaleString(undefined, { maximumFractionDigits: 1 })
                                                : '< 0.1'
                                            : aq.count || aq.value}
                                        <span className="unit-label">{hasArea ? 'km²' : ''}</span>
                                    </div>
                                    <div className="aquifer-percent">{Number(aq.percent).toFixed(1)}%</div>
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
