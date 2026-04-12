import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import SmartChartContainer from '../Common/SmartChartContainer';

const ComplianceChart = ({ data }) => {
    return (
        <SmartChartContainer height="300px" className="bar-chart-wrapper">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 45, left: 80, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                    dataKey="subject"
                    type="category"
                    width={70}
                    tick={{ fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip
                    allowEscapeViewBox={{ x: false, y: true }}
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                                <div className="custom-chart-tooltip">
                                    <p className="tooltip-title">{item.subject}</p>
                                    <p className="tooltip-item"><strong>Limit:</strong> {item.label}</p>
                                    <p className="tooltip-item"><strong>Exceedance:</strong> {item.value}% Stations</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar dataKey="value" fill="#f4a261" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
        </SmartChartContainer>
    );
};

export default ComplianceChart;
