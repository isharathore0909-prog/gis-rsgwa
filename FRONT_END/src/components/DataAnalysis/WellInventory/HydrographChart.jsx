import React, { useMemo } from 'react';
import {
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Bar,
    Line,
    LabelList
} from 'recharts';
import SmartChartContainer from '../Common/SmartChartContainer';
import { calculateRobustTrendLine } from '../../../utils/statsUtils';

const HydrographChart = ({ data, dataKey = 'Average Water Level', height, isExpanded, showRainfall = true }) => {
    const processedData = useMemo(() => {
        if (!data) return [];

        const baseData = data.map(d => ({
            ...d,
            [dataKey]: d[dataKey] ?? null
        }));

        const levelTrend = calculateRobustTrendLine(baseData, dataKey);
        const rainTrend = showRainfall ? calculateRobustTrendLine(baseData, 'Annual Rainfall') : null;

        return baseData.map((d, i) => ({
            ...d,
            'Level Trend': levelTrend && levelTrend[i] != null ? parseFloat(levelTrend[i].toFixed(3)) : null,
            'Rainfall Trend': rainTrend && rainTrend[i] != null ? parseFloat(rainTrend[i].toFixed(3)) : null
        }));
    }, [data, dataKey, showRainfall]);

    if (!processedData.length) return null;

    const getSeriesColor = () => {
        if (dataKey.includes('Pre')) return '#3b82f6';
        if (dataKey.includes('Post')) return '#0ea5e9';
        return '#1e3a8a';
    };

    const seriesColor = getSeriesColor();

    return (
        <SmartChartContainer height={height || (isExpanded ? '500px' : '400px')}>
            <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />

                {showRainfall && (
                    <YAxis
                        yAxisId="left"
                        label={{
                            value: 'Annual Rainfall (m)',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: '10px', fill: '#3b82f6', fontWeight: 600 },
                            dx: -10
                        }}
                        tick={{ fontSize: 10, fill: '#3b82f6' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, dataMax => dataMax * 1.4]}
                    />
                )}

                <YAxis
                    yAxisId="right"
                    orientation={showRainfall ? "right" : "left"}
                    reversed={true}
                    label={{
                        value: 'Static water level in m.bgl',
                        angle: showRainfall ? 90 : -90,
                        position: showRainfall ? 'insideRight' : 'insideLeft',
                        style: { fontSize: '10px', fill: seriesColor, fontWeight: 600 },
                        dx: showRainfall ? 10 : -10
                    }}
                    tick={{ fontSize: 10, fill: seriesColor }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                />

                <Tooltip
                    allowEscapeViewBox={{ x: false, y: true }}
                    contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '0.85rem',
                        pointerEvents: 'none'
                    }}
                    formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(3) : value,
                        name
                    ]}
                    labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />

                {showRainfall && (
                    <Bar
                        yAxisId="left"
                        dataKey="Annual Rainfall"
                        name="Annual Rainfall (m)"
                        fill="#93c5fd"
                        barSize={30}
                        radius={[2, 2, 0, 0]}
                    >
                        <LabelList
                            dataKey="Annual Rainfall"
                            position="top"
                            style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }}
                            formatter={(v) => v ? v.toFixed(2) : ''}
                        />
                    </Bar>
                )}

                {showRainfall && (
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Rainfall Trend"
                        name="Linear (Annual Rainfall)"
                        stroke="#60a5fa"
                        strokeDasharray="5 5"
                        dot={false}
                        strokeWidth={1.5}
                    />
                )}

                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={dataKey}
                    name={dataKey}
                    stroke={seriesColor}
                    strokeWidth={3}
                    dot={{ r: 5, fill: seriesColor }}
                    connectNulls
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Level Trend"
                    name={`Linear (${dataKey})`}
                    stroke={seriesColor}
                    strokeDasharray="3 3"
                    dot={false}
                    strokeWidth={1.5}
                />
            </ComposedChart>
        </SmartChartContainer>
    );
};

export default React.memo(HydrographChart);
