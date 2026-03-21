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

const HydrographChart = ({ data, height, isExpanded, showRainfall = true }) => {
    const processedData = useMemo(() => {
        if (!data) return [];

        const baseData = data.map(d => ({
            ...d,
            'Average Water Level': d[`avg_${d.year}`] ?? d['Average Water Level'] ?? null
        }));

        const avgTrend = calculateRobustTrendLine(baseData, 'Average Water Level');
        const rainTrend = showRainfall ? calculateRobustTrendLine(baseData, 'Annual Rainfall') : null;

        return baseData.map((d, i) => ({
            ...d,
            'Average Trend': avgTrend ? avgTrend[i] : null,
            'Rainfall Trend': rainTrend ? rainTrend[i] : null
        }));
    }, [data, showRainfall]);

    if (!processedData.length) return null;

    return (
        <SmartChartContainer height={height || (isExpanded ? '450px' : '350px')}>
            <ComposedChart data={processedData} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />

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
                        domain={[0, 'auto']}
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
                        style: { fontSize: '10px', fill: '#ef4444', fontWeight: 600 },
                        dx: showRainfall ? 10 : -10
                    }}
                    tick={{ fontSize: 10, fill: '#ef4444' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                />

                <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '0.85rem',
                        pointerEvents: 'none'
                    }}
                    labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />

                {showRainfall && (
                    <Bar
                        yAxisId="left"
                        dataKey="Annual Rainfall"
                        name="Annual Rainfall (m)"
                        fill="#3b82f6"
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
                        stroke="#3b82f6"
                        strokeDasharray="5 5"
                        dot={false}
                        strokeWidth={1.5}
                    />
                )}

                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Average Water Level"
                    name="Avg Water Level (m)"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#6366f1' }}
                    connectNulls
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Average Trend"
                    name="Linear (Avg Level)"
                    stroke="#6366f1"
                    strokeDasharray="3 3"
                    dot={false}
                    strokeWidth={1.5}
                />
            </ComposedChart>
        </SmartChartContainer>
    );
};

export default React.memo(HydrographChart);
