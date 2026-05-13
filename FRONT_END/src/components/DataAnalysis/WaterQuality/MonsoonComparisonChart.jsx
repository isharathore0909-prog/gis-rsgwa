import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import SmartChartContainer from '../Common/SmartChartContainer';

/**
 * MonsoonComparisonChart - Standardized on Highcharts
 * Compares water quality parameters between pre-monsoon and post-monsoon periods.
 */
const MonsoonComparisonChart = ({ summary, isOverview = false }) => {
    if (!summary || (summary.total_records === 0 && !isOverview)) return null;

    const options = useMemo(() => {
        const dataRows = [
            { name: 'pH', pre: summary.avg_pre_ph, post: summary.avg_post_ph },
            { name: isOverview ? 'TDS (mg/l)' : 'TDS/10', pre: summary.avg_pre_tds / 10, post: summary.avg_post_tds / 10 },
            { name: 'Hardness', pre: summary.avg_pre_hardness, post: summary.avg_post_hardness },
            { name: 'Alkalinity', pre: summary.avg_pre_alkalinity, post: summary.avg_post_alkalinity },
        ];

        return {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: isOverview ? 300 : 250,
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            xAxis: {
                categories: dataRows.map(d => d.name),
                labels: { style: { fontSize: isOverview ? '11px' : '10px', color: '#64748b' } },
                lineWidth: 1,
                lineColor: '#e2e8f0',
                tickWidth: 0
            },
            yAxis: {
                title: { text: null },
                labels: { style: { fontSize: isOverview ? '11px' : '10px', color: '#64748b' } },
                gridLineColor: '#f1f5f9'
            },
            tooltip: {
                shared: true,
                useHTML: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0,
                shadow: true,
                borderRadius: 8,
                formatter: function () {
                    const isTds = this.x.includes('TDS');
                    const label = isTds && !isOverview ? 'TDS' : this.x;

                    let rows = ``;
                    this.points.forEach(p => {
                        const val = isTds ? (p.y * 10) : p.y;
                        rows += `<p style="margin: 2px 0; color: ${p.color}; font-size: 11px;">
                            <strong>${p.series.name}:</strong> ${val.toFixed(1)}
                        </p>`;
                    });

                    return `<div style="padding: 8px;">
                        <p style="margin:0 0 5px 0; font-weight:700; color:#1e293b; font-size: 12px;">${label}</p>
                        ${rows}
                    </div>`;
                }
            },
            legend: { enabled: false },
            plotOptions: {
                column: {
                    borderRadius: isOverview ? 4 : 2,
                    borderWidth: 0,
                    pointPadding: 0.2,
                    groupPadding: 0.1
                },
                series: { animation: false }
            },
            series: [
                { name: 'Pre-Monsoon', data: dataRows.map(d => d.pre), color: '#f4a261' },
                { name: 'Post-Monsoon', data: dataRows.map(d => d.post), color: '#2a9d8f' }
            ],
            credits: { enabled: false }
        };
    }, [summary, isOverview]);

    return (
        <div className={`water-quality-comparison-section full-width ${isOverview ? 'animated-entry' : ''}`} style={isOverview ? { marginTop: '1.5rem' } : { marginTop: '2rem' }}>
            {!isOverview && (
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#475569', fontWeight: 600 }}>
                    Pre vs Post Monsoon Comparison
                </h4>
            )}
            <SmartChartContainer height={isOverview ? "300px" : "250px"} className={isOverview ? "bar-chart-wrapper" : ""}>
                {options ? (
                    <HighchartsReact highcharts={Highcharts} options={options} />
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#94a3b8',
                        fontSize: '13px'
                    }}>
                        No comparison data available
                    </div>
                )}
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

export default React.memo(MonsoonComparisonChart);
