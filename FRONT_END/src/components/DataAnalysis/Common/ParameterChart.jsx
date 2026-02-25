import React from 'react';
import { PieChart, Pie } from 'recharts';
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
