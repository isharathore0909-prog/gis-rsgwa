import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import SmartChartContainer from '../Common/SmartChartContainer';

/**
 * WaterLevelChart - Standardized on Highcharts
 * Visualizes water level trends over years (mbgl).
 */
const WaterLevelChart = ({ data, height, showDots = true, isExpanded }) => {
    const options = useMemo(() => {
        if (!data || data.length === 0) return null;

        const processedData = data.map(d => ({
            year: d.year,
            value: d[`avg_${d.year}`] ?? d['Average Water Level'] ?? null
        }));

        return {
            chart: {
                type: 'line',
                backgroundColor: 'transparent',
                height: height ? parseInt(height.replace('px', '')) : (isExpanded ? 400 : 300),
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            xAxis: {
                categories: processedData.map(d => d.year),
                labels: { style: { fontSize: '10px', color: '#64748b' } },
                lineWidth: 0,
                tickWidth: 0,
                crosshair: true
            },
            yAxis: {
                reversed: true, // depth below ground level
                title: {
                    text: 'Depth (m bgl)',
                    style: { fontSize: '10px', color: '#94a3b8', fontWeight: '500' }
                },
                labels: { style: { fontSize: '10px', color: '#64748b' } },
                gridLineColor: '#f1f5f9',
                lineWidth: 0
            },
            tooltip: {
                shared: true,
                valueSuffix: ' m',
                valueDecimals: 2,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0,
                shadow: {
                    color: 'rgba(0,0,0,0.1)',
                    offsetX: 0,
                    offsetY: 4,
                    width: 12
                },
                headerFormat: '<span style="font-size: 11px; font-weight: 700; color: #1e293b;">{point.key}</span><br/>'
            },
            legend: {
                itemStyle: { fontSize: '11px', color: '#475569', fontWeight: '500' },
                padding: 10,
                symbolRadius: 6
            },
            plotOptions: {
                line: {
                    marker: {
                        enabled: showDots,
                        radius: 4,
                        fillColor: '#6366f1',
                        lineWidth: 2,
                        lineColor: '#ffffff'
                    },
                    states: {
                        hover: { lineWidthPlus: 1 }
                    }
                },
                series: { animation: false }
            },
            series: [{
                name: 'Avg Water Level',
                data: processedData.map(d => d.value),
                color: '#6366f1',
                lineWidth: 3,
                connectNulls: true
            }],
            credits: { enabled: false }
        };
    }, [data, height, showDots, isExpanded]);

    return (
        <SmartChartContainer height={height || (isExpanded ? '400px' : '300px')}>
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
                    No trend data available
                </div>
            )}
        </SmartChartContainer>
    );
};

export default React.memo(WaterLevelChart);
