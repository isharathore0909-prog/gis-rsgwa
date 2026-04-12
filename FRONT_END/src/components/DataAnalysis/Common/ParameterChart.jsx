import React from 'react';
import { PieChart, Pie, Tooltip } from 'recharts';
import SmartChartContainer from './SmartChartContainer';

const ParameterChart = ({ name, value, limit, unit, status, color }) => {
    const isExceeded = status === 'High' || status === 'Out Range';

    return (
        <div className="water-quality-mini-card" style={{ position: 'relative' }}>
            <SmartChartContainer height="100px">
                <PieChart>
                    <Pie
                        data={[
                            { value: Math.min(value, limit), fill: isExceeded ? '#e63946' : '#2a9d8f' },
                            { value: Math.max(0, limit - value), fill: '#e5e7eb' }
                        ]}
                        cx="50%" cy="50%" innerRadius={22} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270}
                    />
                    <Tooltip
                        allowEscapeViewBox={{ x: false, y: true }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="custom-chart-tooltip" style={{ padding: '8px', fontSize: '12px' }}>
                                        <p style={{ margin: 0 }}><strong>{name}</strong></p>
                                        <p style={{ margin: 0 }}>{payload[0].value.toFixed(2)} {unit}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </SmartChartContainer>
            <div className="parameter-name">{name}</div>
            <div className="parameter-stats">
                <div>Amount: {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value} {unit}</div>
                <div>Limit: {limit} {unit}</div>
            </div>
            <div className={`parameter-status ${isExceeded ? 'exceeded' : 'safe'}`}>
                {status}
            </div>
        </div>
    );
};

export default ParameterChart;
