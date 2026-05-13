import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import ChartLoader from '../../Common/ChartLoader';
import { calculateLinearTrendLine } from '../../../utils/statsUtils';

const HydrographChart = ({ data, dataKey = 'Average Water Level', height, isExpanded, showRainfall = true, isLoading = false }) => {
    const chartOptions = useMemo(() => {
        if (!data || data.length === 0) return null;

        const baseData = data.map(d => ({
            ...d,
            [dataKey]: d[dataKey] ?? null
        }));

        const levelTrend = calculateLinearTrendLine(baseData, dataKey);
        const rainTrend = showRainfall ? calculateLinearTrendLine(baseData, 'Annual Rainfall') : null;

        const seriesColor = dataKey.includes('Pre') ? '#3b82f6' :
            dataKey.includes('Post') ? '#0ea5e9' : '#1e3a8a';

        const categories = data.map(d => d.year);

        const series = [
            {
                name: dataKey,
                type: 'spline',
                yAxis: showRainfall ? 1 : 0,
                data: baseData.map(d => d[dataKey]),
                color: seriesColor,
                zIndex: 5,
                marker: {
                    enabled: true,
                    radius: 5,
                    fillColor: seriesColor
                },
                lineWidth: 3
            },
            {
                name: `Linear (${dataKey})`,
                type: 'line',
                yAxis: showRainfall ? 1 : 0,
                data: levelTrend || [],
                color: seriesColor,
                dashStyle: 'Dash',
                marker: { enabled: false },
                lineWidth: 1.5,
                zIndex: 4,
                enableMouseTracking: false
            }
        ];

        if (showRainfall) {
            series.unshift({
                name: 'Annual Rainfall (m)',
                type: 'column',
                yAxis: 0,
                data: baseData.map(d => d['Annual Rainfall']),
                color: '#93c5fd',
                zIndex: 1,
                borderRadius: 2,
                dataLabels: {
                    enabled: true,
                    format: '{y:.2f}',
                    style: { fontSize: '9px', fontWeight: '600', color: '#64748b' }
                }
            });

            series.push({
                name: 'Linear (Annual Rainfall)',
                type: 'line',
                yAxis: 0,
                data: rainTrend || [],
                color: '#60a5fa',
                dashStyle: 'ShortDash',
                marker: { enabled: false },
                lineWidth: 1.5,
                zIndex: 2,
                enableMouseTracking: false
            });
        }

        return {
            chart: {
                height: isExpanded ? 500 : 400,
                backgroundColor: 'transparent',
                style: { fontFamily: 'inherit' },
                spacingTop: 20,
                spacingBottom: 40
            },
            title: { text: null },
            xAxis: {
                categories: categories,
                labels: { style: { fontSize: '10px', color: '#64748b' } },
                gridLineWidth: 0,
                axisLine: { visible: false }
            },
            yAxis: showRainfall ? [
                { // Primary (Rainfall)
                    title: {
                        text: 'Annual Rainfall (m)',
                        style: { color: '#3b82f6', fontWeight: '600', fontSize: '10px' }
                    },
                    labels: { style: { color: '#3b82f6', fontSize: '10px' } },
                    gridLineWidth: 1,
                    gridLineColor: '#f1f5f9',
                    min: 0
                },
                { // Secondary (Water Level)
                    title: {
                        text: 'Static water level in m.bgl',
                        style: { color: seriesColor, fontWeight: '600', fontSize: '10px' }
                    },
                    labels: { style: { color: seriesColor, fontSize: '10px' } },
                    reversed: true,
                    opposite: true,
                    gridLineWidth: 0
                }
            ] : [
                {
                    title: {
                        text: 'Static water level in m.bgl',
                        style: { color: seriesColor, fontWeight: '600', fontSize: '10px' }
                    },
                    labels: { style: { color: seriesColor, fontSize: '10px' } },
                    reversed: true,
                    gridLineWidth: 1,
                    gridLineColor: '#f1f5f9'
                }
            ],
            tooltip: {
                shared: true,
                useHTML: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0,
                borderRadius: 8,
                shadow: true,
                headerFormat: '<span style="font-size: 11px; color: #1e293b; font-weight: 700">{point.key}</span><br/>',
                pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y:.3f}</b><br/>'
            },
            legend: {
                enabled: true,
                itemStyle: { fontSize: '10px', fontWeight: '500', color: '#64748b' },
                verticalAlign: 'bottom',
                align: 'center'
            },
            credits: { enabled: false },
            series: series
        };
    }, [data, dataKey, showRainfall, isExpanded]);

    if (!data?.length && !isLoading) return null;

    return (
        <div
            className="hydrograph-chart-wrapper"
            style={{
                height: height || (isExpanded ? '500px' : '400px'),
                width: '100%',
                position: 'relative'
            }}
        >
            <ChartLoader isLoading={isLoading} minHeight="100%">
                {chartOptions ? (
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={chartOptions}
                    />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        No data available for chart
                    </div>
                )}
            </ChartLoader>
        </div>
    );
};

export default React.memo(HydrographChart);
