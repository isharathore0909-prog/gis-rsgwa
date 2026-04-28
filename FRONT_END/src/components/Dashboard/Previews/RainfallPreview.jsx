import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const RainfallPreview = ({ analysisResults }) => {
    if (!analysisResults?.rainfallDistributionData) return null;

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {analysisResults.rainfallStats && (
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '12px 0',
                    background: 'var(--primary-light)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    marginBottom: '4px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Stations</div>
                        <div style={{ fontSize: '1rem', color: 'var(--primary-dark)', fontWeight: '800' }}>
                            {analysisResults.overallDistribution?.unit_count || analysisResults.rainfallStats.unit_count || '---'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Avg. Departure</div>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: '800',
                            color: (analysisResults.overallDistribution?.departure || analysisResults.rainfallStats.departure) > 0 ? '#059669' : '#dc2626'
                        }}>
                            {(analysisResults.overallDistribution?.departure || analysisResults.rainfallStats.departure) > 0 ? '+' : ''}
                            {analysisResults.overallDistribution?.departure ?? analysisResults.rainfallStats.departure ?? '---'}%
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Normal Rainfall</div>
                        <div style={{ fontSize: '1rem', color: 'var(--primary-dark)', fontWeight: '800' }}>
                            {analysisResults.overallDistribution?.normal_avg || analysisResults.rainfallStats.normal_avg?.toFixed(1) || '---'}mm
                        </div>
                    </div>
                </div>
            )}
            <div style={{ width: '100%', height: '300px' }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    options={{
                        chart: {
                            type: 'column',
                            backgroundColor: 'transparent',
                            height: 300,
                            spacing: [10, 5, 10, 5]
                        },
                        title: { text: null },
                        xAxis: {
                            categories: analysisResults.rainfallDistributionData.map(d => d.location),
                            labels: {
                                rotation: -45,
                                style: { fontSize: '9px', fontWeight: '500' },
                                padding: 2,
                                step: 1
                            },
                            tickWidth: 1,
                            lineWidth: 1
                        },
                        yAxis: {
                            min: 0,
                            max: 100,
                            title: { text: null },
                            labels: { enabled: false },
                            gridLineWidth: 0.5
                        },
                        legend: {
                            enabled: true,
                            verticalAlign: 'bottom',
                            layout: 'horizontal',
                            itemStyle: { fontSize: '9px' },
                            padding: 0,
                            margin: 5
                        },
                        plotOptions: {
                            column: {
                                stacking: 'percent',
                                borderWidth: 0,
                                pointPadding: 0.1,
                                groupPadding: 0.1
                            }
                        },
                        tooltip: {
                            shared: true,
                            headerFormat: '<b>{point.key}</b><br/>',
                            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b><br/>'
                        },
                        credits: { enabled: false },
                        series: [
                            { name: 'Excess', data: analysisResults.rainfallDistributionData.map(d => d.statusPercentages.Excess || 0), color: '#bae6fd' },
                            { name: 'Normal', data: analysisResults.rainfallDistributionData.map(d => d.statusPercentages.Normal || 0), color: '#86efac' },
                            { name: 'Deficient', data: analysisResults.rainfallDistributionData.map(d => d.statusPercentages.Deficient || 0), color: '#fde047' },
                            { name: 'Scanty', data: analysisResults.rainfallDistributionData.map(d => d.statusPercentages.Scanty || 0), color: '#ef4444' }
                        ]
                    }}
                />
            </div>
        </div>
    );
};

export default RainfallPreview;
