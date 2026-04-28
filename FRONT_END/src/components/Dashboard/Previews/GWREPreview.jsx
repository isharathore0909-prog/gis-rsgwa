import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const GWREPreview = ({ pieData }) => {
    if (!pieData || pieData.length === 0) return null;

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '100%', height: '360px' }}>
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
                            height: 360,
                            spacing: [0, 0, 0, 0]
                        },
                        title: { text: null },
                        subtitle: { text: null },
                        plotOptions: {
                            pie: {
                                innerSize: '60%',
                                size: '105%',
                                depth: 45,
                                allowPointSelect: true,
                                cursor: 'pointer',
                                dataLabels: {
                                    enabled: false
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
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--text-secondary)'
                            },
                            labelFormat: '{name} ({y})',
                            padding: 0,
                            margin: 5,
                            itemWidth: 90
                        },
                        credits: { enabled: false },
                        tooltip: {
                            pointFormat: '{series.name}: <b>{point.y}</b>'
                        },
                        series: [{
                            name: 'Blocks',
                            data: pieData.map(d => ({
                                name: d.name || 'Uncategorized',
                                y: Number(d.value) || 0,
                                color: d.color || '#e2e8f0'
                            }))
                        }]
                    }}
                />
            </div>
            <div className="total-summary" style={{
                marginTop: '4px',
                padding: '8px 16px',
                background: 'var(--primary-light)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Blocks:</span>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-dark)' }}>
                    {pieData.reduce((sum, d) => sum + (Number(d.value) || 0), 0)}
                </span>
            </div>
        </div>
    );
};

export default GWREPreview;
