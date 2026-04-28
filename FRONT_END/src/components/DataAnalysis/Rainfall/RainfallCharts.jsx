import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ComposedChart, Line, LabelList
} from 'recharts';
import SmartChartContainer from '../Common/SmartChartContainer';

const RainfallCharts = ({ aggregatedData, viewType, isExpanded }) => {
    return (
        <SmartChartContainer height={isExpanded ? '320px' : '240px'} className="bar-chart-wrapper">
            <ComposedChart data={aggregatedData} margin={{ top: 20, right: 35, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(val) => {
                        if (viewType === 'daily') return val.split('-').slice(1).join('/');
                        return val;
                    }}
                />
                <YAxis tick={{ fontSize: 10 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} />
                <Tooltip
                    allowEscapeViewBox={{ y: true }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value.toFixed(1)} mm`, 'Rainfall']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {viewType === 'seasonal' ? (
                    <>
                        <Bar
                            dataKey="monsoon"
                            name="Monsoon (Jun-Sep)"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                        >
                            <LabelList dataKey="monsoon" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} formatter={(val) => Math.round(val)} />
                        </Bar>
                        <Bar
                            dataKey="non_monsoon"
                            name="Non-Monsoon"
                            fill="#f4a261"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                        >
                            <LabelList dataKey="non_monsoon" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} formatter={(val) => Math.round(val)} />
                        </Bar>
                        <Line type="monotone" dataKey="monsoonTrend" name="Monsoon Trend" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line type="monotone" dataKey="nonMonsoonTrend" name="Non-Monsoon Trend" stroke="#e67e22" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </>
                ) : (
                    <>
                        <Bar
                            dataKey="average"
                            name={viewType === 'yearly' ? 'Annual Rainfall' : 'Avg Rain (mm)'}
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                        >
                            {viewType === 'yearly' && (
                                <LabelList dataKey="average" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} formatter={(val) => Math.round(val)} />
                            )}
                        </Bar>
                        <Line type="monotone" dataKey="trend" name="Linear Trend" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </>
                )}
            </ComposedChart>
        </SmartChartContainer>
    );
};

export default React.memo(RainfallCharts);
