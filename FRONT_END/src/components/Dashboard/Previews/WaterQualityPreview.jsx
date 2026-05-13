import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import more from 'highcharts/highcharts-more';

// Initialize Highcharts more module for polar/spiderweb charts
if (typeof Highcharts === 'object' && more) {
    if (typeof more === 'function') {
        more(Highcharts);
    } else if (typeof more.default === 'function') {
        more.default(Highcharts);
    }
}

const WaterQualityPreview = ({ analysisResults, metricColor }) => {
    const chartOptions = useMemo(() => {
        const rawData = analysisResults?.qualityData || [];
        if (rawData.length === 0) return null;

        const labelMap = {
            'EC': 'E.C.',
            'TDS': 'TDS',
            'Fluoride': 'Fluoride',
            'Nitrate': 'Nitrate',
            'Hardness': 'Hardness',
            'pH': 'pH'
        };

        return {
            chart: {
                polar: true,
                type: 'area',
                backgroundColor: 'transparent',
                height: 240,
                spacing: [10, 0, 10, 0]
            },
            title: { text: null },
            pane: { size: '80%' },
            xAxis: {
                categories: rawData.map(d => labelMap[d.subject] || d.subject),
                tickmarkPlacement: 'on',
                lineWidth: 0,
                gridLineColor: '#e2e8f0',
                labels: {
                    style: { fontSize: '10px', fontWeight: '600', color: '#334155' },
                    distance: 15
                }
            },
            yAxis: {
                gridLineInterpolation: 'polygon',
                lineWidth: 0,
                min: 0,
                max: 100,
                tickInterval: 25,
                gridLineColor: '#e2e8f0',
                labels: {
                    enabled: true,
                    style: { fontSize: '9px', color: '#94a3b8' },
                    align: 'right',
                    x: -2
                }
            },
            tooltip: {
                shared: true,
                pointFormat: '{series.name}: <b>{point.y}%</b>',
                style: { fontSize: '10px' }
            },
            legend: { enabled: false },
            credits: { enabled: false },
            series: [{
                name: 'Exceedance',
                data: rawData.map(d => d.value),
                pointPlacement: 'on',
                color: '#3b82f6',
                fillColor: 'rgba(59, 130, 246, 0.3)',
                lineWidth: 2,
                marker: { enabled: false }
            }]
        };
    }, [analysisResults?.qualityData]);

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
                {chartOptions && (
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={chartOptions}
                    />
                )}
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
