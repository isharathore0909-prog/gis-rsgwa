import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import SmartChartContainer from '../Common/SmartChartContainer';

/**
 * RainfallCharts - Standardized on Highcharts
 * Visualizes rainfall data with bar charts and trendlines.
 */
const RainfallCharts = ({ aggregatedData, viewType, isExpanded }) => {
    const options = useMemo(() => {
        if (!aggregatedData || aggregatedData.length === 0) return null;

        const isSeasonal = viewType === 'seasonal';
        const categories = aggregatedData.map(d => {
            if (viewType === 'daily' && d.name) return d.name.split('-').slice(1).join('/');
            return d.name;
        });

        const series = [];

        if (isSeasonal) {
            series.push({
                name: 'Monsoon (Jun-Sep)',
                type: 'column',
                data: aggregatedData.map(d => d.monsoon),
                color: '#3b82f6',
                borderRadius: 4,
                dataLabels: { enabled: true, format: '{y:.0f}', style: { fontSize: '10px' } }
            });
            series.push({
                name: 'Non-Monsoon',
                type: 'column',
                data: aggregatedData.map(d => d.non_monsoon),
                color: '#f4a261',
                borderRadius: 4,
                dataLabels: { enabled: true, format: '{y:.0f}', style: { fontSize: '10px' } }
            });
            series.push({
                name: 'Monsoon Trend',
                type: 'line',
                data: aggregatedData.map(d => d.monsoonTrend),
                color: '#ef4444',
                dashStyle: 'Dash',
                lineWidth: 2,
                marker: { enabled: false },
                states: { hover: { lineWidth: 3 } }
            });
            series.push({
                name: 'Non-Monsoon Trend',
                type: 'line',
                data: aggregatedData.map(d => d.nonMonsoonTrend),
                color: '#e67e22',
                dashStyle: 'Dash',
                lineWidth: 2,
                marker: { enabled: false },
                states: { hover: { lineWidth: 3 } }
            });
        } else {
            series.push({
                name: viewType === 'yearly' ? 'Annual Rainfall' : 'Avg Rain (mm)',
                type: 'column',
                data: aggregatedData.map(d => d.average),
                color: '#3b82f6',
                borderRadius: 4,
                dataLabels: {
                    enabled: viewType === 'yearly',
                    format: '{y:.0f}',
                    style: { fontSize: '10px', color: '#64748b' }
                }
            });
            series.push({
                name: 'Linear Trend',
                type: 'line',
                data: aggregatedData.map(d => d.trend),
                color: '#ef4444',
                dashStyle: 'Dash',
                lineWidth: 2,
                marker: { enabled: false },
                states: { hover: { lineWidth: 3 } }
            });
        }

        return {
            chart: {
                backgroundColor: 'transparent',
                height: isExpanded ? 320 : 240,
                style: { fontFamily: 'inherit' }
            },
            title: { text: null },
            xAxis: {
                categories,
                labels: { style: { fontSize: '9px', color: '#64748b' } },
                gridLineWidth: 0,
                lineColor: '#e2e8f0'
            },
            yAxis: {
                title: { text: null },
                labels: { style: { fontSize: '10px', color: '#64748b' } },
                gridLineColor: '#f1f5f9'
            },
            tooltip: {
                shared: true,
                valueSuffix: ' mm',
                valueDecimals: 1,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0,
                shadow: {
                    color: 'rgba(0,0,0,0.1)',
                    offsetX: 0,
                    offsetY: 4,
                    width: 12
                }
            },
            legend: {
                itemStyle: { fontSize: '11px', color: '#475569', fontWeight: '500' },
                padding: 10
            },
            plotOptions: {
                series: { animation: false }
            },
            credits: { enabled: false },
            series
        };
    }, [aggregatedData, viewType, isExpanded]);

    return (
        <SmartChartContainer
            height={isExpanded ? '320px' : '240px'}
            className="bar-chart-wrapper"
        >
            {options ? (
                <HighchartsReact
                    highcharts={Highcharts}
                    options={options}
                />
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8',
                    fontSize: '13px'
                }}>
                    No data available
                </div>
            )}
        </SmartChartContainer>
    );
};

export default React.memo(RainfallCharts);
