import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Tooltip as RechartsTooltip, Legend
} from 'recharts';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const WaterQualityCharts = ({ data, analysisResults, metricColor }) => {
    return (
        <>
            <div className="chart-item">
                <h3>Detailed Analysis</h3>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
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
                                enabled: false
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
                                }
                            },
                            credits: { enabled: false },
                            series: [{
                                name: 'Stations',
                                color: metricColor || '#2563eb',
                                data: (data?.features || []).map(f => {
                                    const ec = parseFloat(f.properties['EC']);
                                    const tds = parseFloat(f.properties['TDS']);
                                    if (!isNaN(ec) && !isNaN(tds)) {
                                        return [ec, tds];
                                    }
                                    return null;
                                }).filter(d => d !== null)
                            }]
                        }}
                    />
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
                            {analysisResults?.qualityData?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius={120} data={analysisResults.qualityData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                                        <Radar
                                            name="Exceedance %"
                                            dataKey="value"
                                            stroke={metricColor}
                                            fill={metricColor}
                                            fillOpacity={0.6}
                                        />
                                        <RechartsTooltip
                                            formatter={(value) => [`${value}%`, 'Exceedance']}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p>No quality profile data available.</p>
                                </div>
                            )}
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
                                    enabled: false
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
                                    }
                                },
                                credits: { enabled: false },
                                series: [{
                                    name: 'Stations',
                                    color: metricColor || '#2563eb',
                                    data: (data?.features || []).map(f => {
                                        const calcium = parseFloat(f.properties['Calcium']);
                                        const magnesium = parseFloat(f.properties['Magnesium']);
                                        const hardness = parseFloat(f.properties['Hardness']);

                                        const caMgSum = (!isNaN(calcium) ? calcium : 0) + (!isNaN(magnesium) ? magnesium : 0);
                                        const hasCaOrMg = !isNaN(calcium) || !isNaN(magnesium);

                                        if (hasCaOrMg && !isNaN(hardness)) {
                                            return [caMgSum, hardness];
                                        }
                                        return null;
                                    }).filter(d => d !== null)
                                }]
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default WaterQualityCharts;
