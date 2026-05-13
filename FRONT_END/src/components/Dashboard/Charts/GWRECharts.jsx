import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HydrographChart from '../../DataAnalysis/WellInventory/HydrographChart';
import ChartLoader from '../../Common/ChartLoader';

const GWRECharts = ({ analysisResults, isLoading }) => {
    const displayBlock = analysisResults?.displayBlock || null;
    const isBlockSelected = !!displayBlock;

    const aquiferChartOptions = useMemo(() => {
        const rawData = analysisResults?.aquiferData?.slice(0, 6) || [];
        if (rawData.length === 0) return null;

        return {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: 500,
                spacingBottom: 60
            },
            title: { text: null },
            xAxis: {
                categories: rawData.map(d => d.name),
                labels: {
                    rotation: -45,
                    style: { fontSize: '10px', fontWeight: '600', color: '#475569' }
                },
                lineWidth: 1,
                lineColor: '#e2e8f0'
            },
            yAxis: {
                title: { text: null },
                labels: {
                    style: { fontSize: '11px', fontWeight: '700', color: '#334155' },
                    format: '{value}'
                },
                maxPadding: 0.35,
                gridLineColor: '#f1f5f9'
            },
            tooltip: {
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                shadow: true,
                useHTML: true,
                formatter: function () {
                    const point = rawData[this.point.index];
                    const unit = point.unit || '';
                    return `<div style="padding: 4px">Area: <b>${this.y.toLocaleString()} ${unit}</b></div>`;
                }
            },
            plotOptions: {
                column: {
                    borderRadius: 6,
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        formatter: function () {
                            const point = rawData[this.point.index];
                            return point.percent !== undefined ? `${point.percent}%` : '';
                        },
                        style: {
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#64748b',
                            textOutline: 'none'
                        }
                    }
                }
            },
            credits: { enabled: false },
            legend: { enabled: false },
            series: [{
                name: 'Area',
                data: rawData.map(d => ({
                    y: d.value,
                    color: d.color || '#3b82f6'
                }))
            }]
        };
    }, [analysisResults?.aquiferData]);

    return (
        <>
            <div className="chart-item">
                <h3>Detailed Analysis</h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div className="chart-container" style={{ height: '350px', background: 'white', padding: '20px', borderRadius: '12px', width: '100%' }}>
                        <ChartLoader isLoading={isLoading} minHeight="310px">
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={{
                                    chart: {
                                        type: 'pie',
                                        options3d: {
                                            enabled: true,
                                            alpha: 45,
                                            beta: 0
                                        },
                                        backgroundColor: 'transparent',
                                        height: 350,
                                        spacingTop: 0,
                                        spacingBottom: 0
                                    },
                                    title: { text: null },
                                    plotOptions: {
                                        pie: {
                                            innerSize: '60%',
                                            depth: 45,
                                            allowPointSelect: true,
                                            cursor: 'pointer',
                                            dataLabels: {
                                                enabled: true,
                                                format: '<b>{point.name}</b>: {point.y}',
                                                distance: 20,
                                                style: {
                                                    textOutline: 'none',
                                                    fontSize: '11px'
                                                }
                                            },
                                            showInLegend: true,
                                            edgeWidth: 1,
                                            edgeColor: 'rgba(255, 255, 255, 0.5)'
                                        }
                                    },
                                    legend: {
                                        enabled: true,
                                        verticalAlign: 'bottom',
                                        layout: 'horizontal',
                                        itemStyle: {
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: 'var(--text-secondary)'
                                        }
                                    },
                                    credits: { enabled: false },
                                    series: [{
                                        name: 'Blocks',
                                        data: (analysisResults?.pieData || []).map(d => ({
                                            name: d.name || 'Uncategorized',
                                            y: Number(d.value) || 0,
                                            color: d.color || '#e2e8f0'
                                        })).filter(d => d.y > 0)
                                    }]
                                }}
                            />
                        </ChartLoader>
                    </div>
                    <div className="total-summary-large" style={{
                        marginTop: '20px',
                        padding: '12px 32px',
                        background: isBlockSelected ? '#fef3c7' : 'var(--primary-light)',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {isBlockSelected ? `Block: ${displayBlock}` : 'Grand Total Blocks:'}
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary-dark)' }}>
                            {isBlockSelected
                                ? ((analysisResults?.pieData || []).find(d => d.value > 0)?.name || '—')
                                : (analysisResults?.pieData || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0)
                            }
                        </span>
                    </div>
                </div>
            </div>

            <div className="chart-item">
                <h3>Top Aquifers</h3>
                <div style={{ height: '450px', width: '100%', padding: '10px' }}>
                    <ChartLoader isLoading={isLoading} minHeight="430px">
                        {aquiferChartOptions ? (
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={aquiferChartOptions}
                            />
                        ) : (
                            <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                                <p>No aquifer data available for this region.</p>
                            </div>
                        )}
                    </ChartLoader>
                </div>
            </div>

            <div className="chart-item">
                <h3>Trend Analysis</h3>
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
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </>
    );
};

export default GWRECharts;
