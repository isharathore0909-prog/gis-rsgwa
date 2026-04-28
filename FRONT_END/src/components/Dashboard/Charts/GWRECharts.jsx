import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HydrographChart from '../../DataAnalysis/WellInventory/HydrographChart';

const GWRECharts = ({ analysisResults }) => {
    const displayBlock = analysisResults?.displayBlock || null;
    const isBlockSelected = !!displayBlock;
    return (
        <>
            <div className="chart-item">
                <h3>Detailed Analysis</h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div className="chart-container" style={{ height: '350px', background: 'white', padding: '20px', borderRadius: '12px', width: '100%' }}>
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
                <div style={{ height: '350px', width: '100%', padding: '10px' }}>
                    {analysisResults?.aquiferData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analysisResults.aquiferData.slice(0, 6)}
                                layout="vertical"
                                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide domain={[0, 'dataMax']} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        background: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                                    }}
                                    formatter={(value, name, props) => {
                                        const unit = props.payload.unit || '';
                                        return [`${value.toLocaleString()} ${unit}`, 'Magnitude'];
                                    }}
                                />
                                <Bar
                                    dataKey="value"
                                    barSize={22}
                                    radius={[0, 6, 6, 0]}
                                    isAnimationActive={false}
                                    label={{
                                        position: 'right',
                                        formatter: (v, entry) => {
                                            const pct = entry?.payload?.percent;
                                            return pct !== undefined ? `${pct}%` : '';
                                        },
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fill: '#64748b',
                                        dx: 5
                                    }}
                                >
                                    {analysisResults.aquiferData.slice(0, 6).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                            <p>No aquifer data available for this region.</p>
                        </div>
                    )}
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
                    />
                </div>
            </div>
        </>
    );
};

export default GWRECharts;
