import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import ChartLoader from '../../Common/ChartLoader';
import { calculateScatterRegression } from '../../../utils/statsUtils';

// Add more-chart (for spiderweb/radar)
import more from 'highcharts/highcharts-more';
if (typeof Highcharts === 'object' && more) {
    if (typeof more === 'function') {
        more(Highcharts);
    } else if (typeof more.default === 'function') {
        more.default(Highcharts);
    }
}

const WaterQualityCharts = ({ data, analysisResults, metricColor, isLoading }) => {
    // 1. EC vs TDS Correlation Data
    const ecTdsData = useMemo(() => {
        return (data?.features || []).slice(0, 1000).map(f => {
            const ec = parseFloat(f.properties['EC']);
            const tds = parseFloat(f.properties['TDS']);
            if (!isNaN(ec) && !isNaN(tds)) {
                return [ec, tds];
            }
            return null;
        }).filter(d => d !== null);
    }, [data]);

    const ecTdsTrend = useMemo(() =>
        analysisResults?.waterQualityStats?.correlations?.ec_vs_tds,
        [analysisResults?.waterQualityStats?.correlations?.ec_vs_tds]
    );

    // 2. Hardness Correlation Data
    const hardnessData = useMemo(() => {
        return (data?.features || []).slice(0, 1000).map(f => {
            const calcium = parseFloat(f.properties['Calcium']);
            const magnesium = parseFloat(f.properties['Magnesium']);
            const hardness = parseFloat(f.properties['Hardness']);
            const caMgSum = (!isNaN(calcium) ? calcium : 0) + (!isNaN(magnesium) ? magnesium : 0);
            const hasCaOrMg = !isNaN(calcium) || !isNaN(magnesium);

            if (hasCaOrMg && !isNaN(hardness)) {
                return [caMgSum, hardness];
            }
            return null;
        }).filter(d => d !== null);
    }, [data]);

    const hardnessTrend = useMemo(() =>
        analysisResults?.waterQualityStats?.correlations?.ca_mg_vs_hardness,
        [analysisResults?.waterQualityStats?.correlations?.ca_mg_vs_hardness]
    );

    // Quality Profile Chart Options
    const qualityChartOptions = useMemo(() => {
        const rawData = analysisResults?.qualityData || [];
        if (rawData.length === 0) return null;

        // Map subjects to match shortened labels in image
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
                height: 350,
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            pane: { size: '80%' },
            xAxis: {
                categories: rawData.map(d => labelMap[d.subject] || d.subject),
                tickmarkPlacement: 'on',
                lineWidth: 0,
                gridLineColor: '#e2e8f0',
                labels: {
                    style: { fontSize: '12px', fontWeight: '600', color: '#334155' }
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
                    style: { fontSize: '10px', color: '#94a3b8' },
                    align: 'right',
                    x: -5,
                    y: 15
                }
            },
            tooltip: {
                shared: true,
                pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}%</b>'
            },
            legend: {
                enabled: false
            },
            credits: { enabled: false },
            series: [{
                name: 'Exceedance %',
                data: rawData.map(d => d.value),
                pointPlacement: 'on',
                color: '#3b82f6', // Consistent blue
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, 'rgba(59, 130, 246, 0.4)'],
                        [1, 'rgba(59, 130, 246, 0.1)']
                    ]
                },
                lineWidth: 2,
                marker: {
                    enabled: false,
                    states: { hover: { enabled: true, radius: 4 } }
                }
            }]
        };
    }, [analysisResults?.qualityData]);

    return (
        <>
            <div className="chart-item">
                <h3>Detailed Analysis</h3>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                    <ChartLoader isLoading={isLoading} height="330px">
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={{
                                chart: {
                                    type: 'scatter',
                                    zoomType: 'xy',
                                    backgroundColor: 'transparent',
                                    height: 350
                                },
                                title: { text: 'EC vs TDS Correlation' },
                                xAxis: {
                                    title: {
                                        enabled: true,
                                        text: 'Electrical Conductivity (µS/cm)'
                                    },
                                    startOnTick: true,
                                    endOnTick: true,
                                    showLastLabel: true
                                },
                                yAxis: {
                                    title: {
                                        text: 'Total Dissolved Solids (mg/l)'
                                    }
                                },
                                legend: {
                                    enabled: !!ecTdsTrend,
                                    align: 'center',
                                    verticalAlign: 'bottom',
                                    layout: 'horizontal',
                                    itemStyle: { fontSize: '10px' }
                                },
                                plotOptions: {
                                    scatter: {
                                        marker: {
                                            radius: 5,
                                            states: {
                                                hover: {
                                                    enabled: true,
                                                    lineColor: 'rgb(100,100,100)'
                                                }
                                            }
                                        },
                                        tooltip: {
                                            headerFormat: '<b>{series.name}</b><br>',
                                            pointFormat: 'EC: {point.x} µS/cm, TDS: {point.y} mg/l'
                                        }
                                    },
                                    line: {
                                        marker: { enabled: false },
                                        states: { hover: { lineWidth: 3 } },
                                        tooltip: {
                                            headerFormat: '<b>Trend Line</b><br>',
                                            pointFormat: 'Linear Regression Analysis'
                                        }
                                    }
                                },
                                credits: { enabled: false },
                                series: [
                                    {
                                        name: 'Stations',
                                        color: metricColor || '#2563eb',
                                        data: ecTdsData,
                                        zIndex: 1
                                    },
                                    ...(ecTdsTrend ? [{
                                        name: `Trend Line (R²: ${ecTdsTrend.r_squared})`,
                                        type: 'line',
                                        data: ecTdsTrend.line_points,
                                        color: '#ef4444',
                                        dashStyle: 'Dash',
                                        lineWidth: 2,
                                        zIndex: 2
                                    }] : [])
                                ]
                            }}
                        />
                    </ChartLoader>
                </div>
            </div>

            <div className="chart-item">
                <h3>Quality Compliance Profile</h3>
                <div style={{ height: '400px', width: '100%' }}>
                    <div className="chart-container" style={{
                        height: '420px',
                        background: 'white',
                        borderRadius: '12px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ChartLoader isLoading={isLoading} height="300px">
                                {qualityChartOptions ? (
                                    <HighchartsReact
                                        highcharts={Highcharts}
                                        options={qualityChartOptions}
                                    />
                                ) : (
                                    <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <p>No quality profile data available.</p>
                                    </div>
                                )}
                            </ChartLoader>
                        </div>
                        <div className="safe-limits-legend" style={{
                            padding: '12px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            color: '#64748b',
                            borderTop: '1px solid #f1f5f9',
                            background: '#f8fafc',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px'
                        }}>
                            <span style={{ color: 'var(--primary-dark)', width: '100%', textAlign: 'center', marginBottom: '4px', fontSize: '11px' }}>Permissible Limits (Safe)</span>
                            <span style={{ padding: '2px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>pH: 6.5 - 8.5</span>
                            <span style={{ padding: '2px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>EC: 3000 µS/cm</span>
                            <span style={{ padding: '2px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>F: 1.5 mg/l</span>
                            <span style={{ padding: '2px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>NO3: 45 mg/l</span>
                            <span style={{ padding: '2px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>TDS: 2000 mg/l</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="chart-item">
                <h3>(Calcium + Magnesium) vs Total Hardness</h3>
                <div style={{ height: '350px', width: '100%', padding: '10px' }}>
                    <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                        <ChartLoader isLoading={isLoading} height="330px">
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={{
                                    chart: {
                                        type: 'scatter',
                                        zoomType: 'xy',
                                        backgroundColor: 'transparent',
                                        height: 350
                                    },
                                    title: { text: null },
                                    xAxis: {
                                        title: {
                                            enabled: true,
                                            text: 'Calcium + Magnesium (mg/l)'
                                        },
                                        startOnTick: true,
                                        endOnTick: true,
                                        showLastLabel: true
                                    },
                                    yAxis: {
                                        title: {
                                            text: 'Total Hardness (mg/l)'
                                        }
                                    },
                                    legend: {
                                        enabled: !!hardnessTrend,
                                        align: 'center',
                                        verticalAlign: 'bottom',
                                        layout: 'horizontal',
                                        itemStyle: { fontSize: '10px' }
                                    },
                                    plotOptions: {
                                        scatter: {
                                            marker: {
                                                radius: 5,
                                                states: {
                                                    hover: {
                                                        enabled: true,
                                                        lineColor: 'rgb(100,100,100)'
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                headerFormat: '<b>{series.name}</b><br>',
                                                pointFormat: 'Ca+Mg: {point.x} mg/l, Total Hardness: {point.y} mg/l'
                                            }
                                        },
                                        line: {
                                            marker: { enabled: false },
                                            states: { hover: { lineWidth: 3 } },
                                            tooltip: {
                                                headerFormat: '<b>Trend Line</b><br>',
                                                pointFormat: 'Linear Regression Analysis'
                                            }
                                        }
                                    },
                                    credits: { enabled: false },
                                    series: [
                                        {
                                            name: 'Stations',
                                            color: metricColor || '#2563eb',
                                            data: hardnessData,
                                            zIndex: 1
                                        },
                                        ...(hardnessTrend ? [{
                                            name: `Trend Line (R²: ${hardnessTrend.r_squared})`,
                                            type: 'line',
                                            data: hardnessTrend.line_points,
                                            color: '#ef4444',
                                            dashStyle: 'Dash',
                                            lineWidth: 2,
                                            zIndex: 2
                                        }] : [])
                                    ]
                                }}
                            />
                        </ChartLoader>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WaterQualityCharts;
