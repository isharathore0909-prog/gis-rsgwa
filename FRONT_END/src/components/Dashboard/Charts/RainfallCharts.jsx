import React, { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import ChartLoader from '../../Common/ChartLoader';

const RainfallCharts = ({ analysisResults, isLoading }) => {
    const [rainfallFilter, setRainfallFilter] = useState('all');

    const monsoonMonths = [5, 6, 7, 8]; // Jun, Jul, Aug, Sep (0-indexed)

    const processedRainfallData = (analysisResults?.rainfallSummaryData || []).map(d => {
        let isMonsoon = false;
        try {
            const date = new Date(d.name);
            const month = date.getMonth();
            isMonsoon = monsoonMonths.includes(month);
        } catch (e) { }

        let opacity = 1;
        if (rainfallFilter === 'monsoon' && !isMonsoon) opacity = 0.25;
        if (rainfallFilter === 'non-monsoon' && isMonsoon) opacity = 0.25;

        return {
            name: d.name,
            y: Number(d.average || d.total || 0),
            color: `rgba(59, 130, 246, ${opacity})`
        };
    });

    return (
        <>
            <div className="chart-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Current Rainfall (Monthly)</h3>
                    <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
                        {['all', 'monsoon', 'non-monsoon'].map(f => (
                            <button
                                key={f}
                                onClick={() => setRainfallFilter(f)}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: rainfallFilter === f ? 'white' : 'transparent',
                                    color: rainfallFilter === f ? '#3b82f6' : '#64748b',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: rainfallFilter === f ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {f.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                    <ChartLoader isLoading={isLoading} minHeight="330px">
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={{
                                chart: { type: 'column', backgroundColor: 'transparent', height: 350 },
                                title: { text: null },
                                xAxis: {
                                    categories: processedRainfallData.map(d => {
                                        try {
                                            const date = new Date(d.name);
                                            return date.toLocaleString('default', { month: 'short', year: '2-digit' });
                                        } catch (e) {
                                            return d.name;
                                        }
                                    }),
                                    title: { text: 'Months' }
                                },
                                yAxis: { title: { text: 'Rainfall (mm)' }, min: 0 },
                                tooltip: { valueSuffix: ' mm' },
                                series: [{
                                    name: 'Monthly Rainfall',
                                    data: processedRainfallData,
                                    borderRadius: 4
                                }],
                                credits: { enabled: false },
                                legend: { enabled: false }
                            }}
                        />
                    </ChartLoader>
                </div>
            </div>

            <div className="chart-item">
                <h3>Year-wise Trend</h3>
                <div className="chart-container" style={{ height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                    <ChartLoader isLoading={isLoading} minHeight="380px">
                        {(() => {
                            const years = Object.keys(analysisResults?.yearlyRainfallData || {}).sort();
                            const yearlyValues = years.map(yr => analysisResults.yearlyRainfallData[yr]);

                            // Use backend-provided overall average if available
                            const avgValue = analysisResults?.rainfallStats?.overall_average ||
                                analysisResults?.overallDistribution?.normal_avg ||
                                (yearlyValues.length > 0 ? (yearlyValues.reduce((a, b) => a + b, 0) / yearlyValues.length) : 0);

                            return (
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={{
                                        chart: { type: 'areaspline', backgroundColor: 'transparent', height: 400 },
                                        title: { text: null },
                                        xAxis: {
                                            categories: years,
                                            title: { text: 'Year' }
                                        },
                                        yAxis: {
                                            title: { text: 'Annual Rainfall (mm)' },
                                            min: 0,
                                            plotLines: avgValue > 0 ? [{
                                                value: avgValue,
                                                color: '#10b981', // Emerald-500
                                                dashStyle: 'Dash',
                                                width: 2,
                                                zIndex: 5,
                                                label: {
                                                    text: `Average: ${avgValue.toFixed(1)} mm`,
                                                    align: 'right',
                                                    style: { color: '#059669', fontWeight: 'bold' }
                                                }
                                            }] : []
                                        },
                                        tooltip: { shared: true, valueSuffix: ' mm' },
                                        plotOptions: {
                                            areaspline: {
                                                fillColor: {
                                                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                                                    stops: [
                                                        [0, 'rgba(59, 130, 246, 0.3)'],
                                                        [1, 'rgba(59, 130, 246, 0)']
                                                    ]
                                                },
                                                marker: { enabled: true, radius: 4 },
                                                lineWidth: 3,
                                                color: '#3b82f6'
                                            }
                                        },
                                        series: [
                                            {
                                                name: 'Annual Rainfall',
                                                data: yearlyValues,
                                                zIndex: 1
                                            },
                                            {
                                                name: 'Average Rainfall',
                                                type: 'line',
                                                color: '#10b981',
                                                dashStyle: 'Dash',
                                                marker: { enabled: false },
                                                data: [], // Dummy series for legend
                                                showInLegend: avgValue > 0
                                            }
                                        ],
                                        credits: { enabled: false }
                                    }}
                                />
                            );
                        })()}
                    </ChartLoader>
                </div>
            </div>

            <div className="chart-item">
                <h3>Rainfall Distribution</h3>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                    <ChartLoader isLoading={analysisResults?.distLoading || isLoading} minHeight="330px">
                        {(() => {
                            const distData = analysisResults?.rainfallDistributionData || [];
                            if (distData.length === 0) {
                                return (
                                    <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <p>No distribution data available for this region.</p>
                                    </div>
                                );
                            }

                            const categoriesMap = {
                                'Excess': { color: '#bae6fd', name: 'Excess' },
                                'Normal': { color: '#86efac', name: 'Normal' },
                                'Deficient': { color: '#fde047', name: 'Deficient' },
                                'Scanty': { color: '#ef4444', name: 'Scanty' },
                                'No Rain': { color: '#cbd5e1', name: 'No Rain' }
                            };

                            const locations = distData.map(d => d.location);
                            const series = Object.keys(categoriesMap).map(catKey => {
                                return {
                                    name: categoriesMap[catKey].name,
                                    color: categoriesMap[catKey].color,
                                    data: distData.map(d => d.statusPercentages ? (d.statusPercentages[catKey] || 0) : 0)
                                };
                            });

                            return (
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={{
                                        chart: { type: 'column', backgroundColor: 'transparent', height: 350 },
                                        title: { text: null },
                                        xAxis: {
                                            categories: locations,
                                            title: { text: analysisResults.analysisLevel === 'State' ? 'Districts' : 'Sub-units' },
                                            labels: { rotation: -45, style: { fontSize: '9px' } }
                                        },
                                        yAxis: {
                                            min: 0,
                                            max: 100,
                                            title: { text: 'Distribution (%)' },
                                            labels: { format: '{value}%' }
                                        },
                                        plotOptions: {
                                            column: {
                                                stacking: 'percent',
                                                borderWidth: 0,
                                                pointPadding: 0.1
                                            }
                                        },
                                        tooltip: {
                                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.percentage:.1f}%</b><br/>'
                                        },
                                        legend: {
                                            enabled: true,
                                            verticalAlign: 'bottom',
                                            layout: 'horizontal',
                                            itemStyle: { fontSize: '10px' }
                                        },
                                        series: series.filter(s => s.data.some(v => v > 0)),
                                        credits: { enabled: false }
                                    }}
                                />
                            );
                        })()}
                    </ChartLoader>
                </div>
            </div>
        </>
    );
};

export default RainfallCharts;
