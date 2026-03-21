import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import SmartChartContainer from '../Common/SmartChartContainer';

const WaterLevelChart = ({ data, height, showDots = true, isExpanded }) => {
    const processedData = useMemo(() => {
        if (!data) return [];
        return data.map(d => ({
            ...d,
            'Average Water Level': d[`avg_${d.year}`] ?? d['Average Water Level'] ?? null
        }));
    }, [data]);

    return (
        <SmartChartContainer height={height || (isExpanded ? '400px' : '300px')}>
            <LineChart data={processedData} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis
                    label={{
                        value: 'Depth (m bgl)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: '10px', fill: '#94a3b8' },
                        dx: 0
                    }}
                    reversed={true}
                    tick={{ fontSize: 10, fill: '#64748b' }}
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
                    formatter={(value) => [`${value} m`, 'Avg Depth']}
                    labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                <Line
                    name="Avg Water Level"
                    type="monotone"
                    dataKey="Average Water Level"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={showDots ? { r: 4, fill: '#6366f1', strokeWidth: 0 } : false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                />
            </LineChart>
        </SmartChartContainer>
    );
};

export default React.memo(WaterLevelChart);
