import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HydrographChart from '../../DataAnalysis/WellInventory/HydrographChart';

const WaterLevelCharts = ({ analysisResults, districtWaterLevelData, fluorideCorrelation, metricColor }) => {
    return (
        <>
            <div className="chart-item">
                <h3>Detailed Analysis</h3>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%', overflow: 'hidden' }}>
                    <HydrographChart
                        data={
                            analysisResults?.yearlyTrends?.yearly_trends
                                ? analysisResults.yearlyTrends.yearly_trends.map(t => ({
                                    ...t,
                                    'Average Water Level': t.average !== undefined ? t.average : t['Average Water Level'],
                                    'Annual Rainfall': analysisResults.yearlyRainfallData && analysisResults.yearlyRainfallData[t.year] ? (analysisResults.yearlyRainfallData[t.year] / 1000) : null
                                }))
                                : Array.isArray(analysisResults?.yearlyTrends) ? analysisResults.yearlyTrends : []
                        }
                        height="340px"
                        showRainfall={true}
                    />
                </div>
            </div>

            <div className="chart-item">
                <h3>District-wise Water Level</h3>
                <div style={{ height: '400px', width: '100%' }}>
                    {districtWaterLevelData?.length > 0 ? (
                        <div className="chart-container" style={{ height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={{
                                    chart: { type: 'column', backgroundColor: 'transparent', height: 400 },
                                    title: { text: 'District-wise Average Water Level' },
                                    xAxis: {
                                        categories: districtWaterLevelData.map(d => d.name),
                                        title: { text: 'Districts' },
                                        labels: { rotation: -45, style: { fontSize: '9px' } }
                                    },
                                    yAxis: {
                                        title: { text: 'Water Level (m.bgl)' },
                                        reversed: false
                                    },
                                    series: [{
                                        name: 'Avg Static WL',
                                        data: districtWaterLevelData.map(d => d.value),
                                        color: metricColor || '#3b82f6',
                                        borderRadius: 4
                                    }],
                                    credits: { enabled: false },
                                    tooltip: { valueSuffix: ' m.bgl' }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                            <p>No district data available.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="chart-item">
                <h3>Fluoride vs Water Level Correlation</h3>
                <div style={{ height: '350px', width: '100%', padding: '10px' }}>
                    {fluorideCorrelation?.length > 0 ? (
                        <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={{
                                    chart: { type: 'scatter', zoomType: 'xy', backgroundColor: 'transparent', height: 350 },
                                    title: { text: 'Fluoride vs Water Level Correlation' },
                                    xAxis: {
                                        title: { enabled: true, text: 'Water Level (m.bgl)' },
                                        startOnTick: true,
                                        endOnTick: true,
                                        showLastLabel: true
                                    },
                                    yAxis: {
                                        title: { text: 'Fluoride (mg/l)' }
                                    },
                                    plotOptions: {
                                        scatter: {
                                            marker: { radius: 5, states: { hover: { enabled: true, lineColor: 'rgb(100,100,100)' } } },
                                            tooltip: {
                                                headerFormat: '<b>{series.name}</b><br>',
                                                pointFormat: 'WL: {point.x} m, F: {point.y} mg/l'
                                            }
                                        }
                                    },
                                    series: [{
                                        name: 'Stations',
                                        color: '#ef4444',
                                        data: fluorideCorrelation
                                    }],
                                    credits: { enabled: false }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                            <p>No correlation data available.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default WaterLevelCharts;
