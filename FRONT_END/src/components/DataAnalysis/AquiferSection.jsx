import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import AnalysisCard from './Common/AnalysisCard';
import SmartChartContainer from './Common/SmartChartContainer';
import './AquiferSection.css';

/**
 * AquiferSection - Standardized on Highcharts
 * Visualizes the distribution of aquifer types in a selected region.
 */
const AquiferSection = ({ displayRegion, displayBlock, data, isLoading, isExpanded, spatialFilterApplied, totalArea, totalCount }) => {
    // Process data based on selected region
    const aquiferData = useMemo(() => {
        if (data && data.length > 0) {
            return data;
        }
        return [];
    }, [data]);

    // Highcharts Configuration
    const options = useMemo(() => {
        if (aquiferData.length === 0) return null;

        return {
            chart: {
                type: 'bar',
                backgroundColor: 'transparent',
                height: isExpanded
                    ? Math.max(400, aquiferData.length * 60)
                    : Math.max(220, aquiferData.length * 50),
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            xAxis: {
                categories: aquiferData.map(d => d.name),
                labels: {
                    style: { fontSize: '10px', fontWeight: '600', color: '#475569' }
                },
                lineWidth: 1,
                lineColor: '#e2e8f0',
                tickWidth: 0
            },
            yAxis: {
                title: { text: null },
                visible: false,
                max: 100
            },
            tooltip: {
                useHTML: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0,
                shadow: {
                    color: 'rgba(0,0,0,0.12)',
                    offsetX: 0,
                    offsetY: 8,
                    width: 24
                },
                borderRadius: 12,
                formatter: function () {
                    const d = aquiferData[this.point.index];
                    return `<div style="padding: 10px 14px; min-width: 160px;">
                        <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 13px;">${d.name}</div>
                        ${d.area > 0 ? `<div style="color: #475569; font-size: 12px;">Area: <strong>${d.area.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²</strong></div>` : ''}
                        ${d.count > 0 ? `<div style="color: #475569; font-size: 12px;">Features: <strong>${d.count}</strong></div>` : ''}
                        <div style="color: #64748b; margin-top: 4px; font-size: 12px;">Share: <strong style="color: ${d.color || '#3b82f6'};">${Number(d.percent).toFixed(1)}%</strong></div>
                    </div>`;
                }
            },
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{y:.1f}%',
                        style: { fontSize: '10px', fontWeight: '600', color: '#64748b' },
                        align: 'right',
                        x: 45
                    }
                },
                series: { animation: false }
            },
            series: [{
                name: 'Share',
                showInLegend: false,
                data: aquiferData.map(d => ({ y: d.percent, color: d.color || '#3b82f6' })),
                animation: false
            }],
            credits: { enabled: false }
        };
    }, [aquiferData, isExpanded]);

    if (data?.isNoData) return null;

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
                            <span className="aq-stat-value">{aquiferData[0]?.name}</span>
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
                            isLoading={isLoading}
                        >
                            {options ? (
                                <HighchartsReact highcharts={Highcharts} options={options} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                    Loading distribution...
                                </div>
                            )}
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

export default React.memo(AquiferSection);
