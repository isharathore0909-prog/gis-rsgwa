import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import SmartChartContainer from '../Common/SmartChartContainer';

/**
 * ComplianceChart - Standardized on Highcharts
 * Visualizes water quality parameter exceedance vs permissible limits.
 */
const ComplianceChart = ({ data }) => {
    const options = useMemo(() => {
        if (!data || data.length === 0) return null;

        return {
            chart: {
                type: 'bar',
                backgroundColor: 'transparent',
                height: 300,
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            xAxis: {
                categories: data.map(d => d.subject),
                labels: { style: { fontSize: '11px', fontWeight: '500', color: '#475569' } },
                lineWidth: 0,
                tickWidth: 0
            },
            yAxis: {
                title: { text: null },
                max: 100,
                visible: false
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    borderWidth: 0,
                    pointWidth: 20
                },
                series: { animation: false }
            },
            tooltip: {
                useHTML: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0,
                shadow: {
                    color: 'rgba(0,0,0,0.1)',
                    offsetX: 0,
                    offsetY: 4,
                    width: 12
                },
                formatter: function () {
                    const item = data[this.point.index];
                    return `<div style="padding: 5px;">
                        <p style="margin:0; font-weight:700; font-size:12px; color:#1e293b;">${item.subject}</p>
                        <p style="margin:5px 0 0 0; font-size:11px; color:#64748b;"><strong>Limit:</strong> ${item.label}</p>
                        <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;"><strong>Exceedance:</strong> <span style="color:#ef4444; font-weight:600;">${this.y}%</span> Stations</p>
                    </div>`;
                }
            },
            series: [{
                name: 'Exceedance',
                showInLegend: false,
                data: data.map(d => ({ y: d.value, color: '#f4a261' })),
                animation: false
            }],
            credits: { enabled: false }
        };
    }, [data]);

    return (
        <SmartChartContainer height="300px" className="bar-chart-wrapper">
            {options ? (
                <HighchartsReact highcharts={Highcharts} options={options} />
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8',
                    fontSize: '13px'
                }}>
                    No compliance data available
                </div>
            )}
        </SmartChartContainer>
    );
};

export default React.memo(ComplianceChart);
