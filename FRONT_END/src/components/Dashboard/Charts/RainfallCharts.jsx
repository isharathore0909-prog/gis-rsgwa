import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const RainfallCharts = ({ analysisResults }) => {
    return (
        <>
            <div className="chart-item">
                <h3>Current Rainfall (Monthly)</h3>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={{
                            chart: { type: 'column', backgroundColor: 'transparent', height: 350 },
                            title: { text: null },
                            xAxis: {
                                categories: (analysisResults?.rainfallSummaryData || []).map(d => {
                                    try {
                                        const date = new Date(d.name);
                                        return date.toLocaleString('default', { month: 'short' });
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
                                data: (analysisResults?.rainfallSummaryData || []).map(d => Number(d.average || d.total || 0)),
                                color: '#3b82f6',
                                borderRadius: 4
                            }],
                            credits: { enabled: false },
                            legend: { enabled: false }
                        }}
                    />
                </div>
            </div>

            <div className="chart-item">
                <h3>Year-wise Trend</h3>
                <div className="chart-container" style={{ height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={{
                            chart: { type: 'areaspline', backgroundColor: 'transparent', height: 400 },
                            title: { text: null },
                            xAxis: {
                                categories: Object.keys(analysisResults?.yearlyRainfallData || {}).sort(),
                                title: { text: 'Year' }
                            },
                            yAxis: { title: { text: 'Annual Rainfall (mm)' }, min: 0 },
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
                            series: [{
                                name: 'Annual Rainfall',
                                data: Object.keys(analysisResults?.yearlyRainfallData || {}).sort().map(yr => analysisResults.yearlyRainfallData[yr])
                            }],
                            credits: { enabled: false }
                        }}
                    />
                </div>
            </div>

            <div className="chart-item">
                <h3>Rainfall Distribution</h3>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
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
                </div>
            </div>
        </>
    );
};

export default RainfallCharts;
