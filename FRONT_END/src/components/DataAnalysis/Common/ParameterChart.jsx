import React from 'react';
import { PieChart, Pie, ResponsiveContainer } from 'recharts';

const ParameterChart = ({ name, value, limit, unit, status, color }) => {
    const isExceeded = status === 'High' || status === 'Out Range';

    // For pH, the value might be a range or a single number. 
    // The original code had specific logic for pH.

    return (
        <div className="water-quality-mini-card">
            <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                    <Pie
                        data={[
                            { value: Math.min(value, limit), fill: isExceeded ? '#e63946' : '#2a9d8f' },
                            { value: Math.max(0, limit - value), fill: '#e5e7eb' }
                        ]}
                        cx="50%" cy="50%" innerRadius={22} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0' }}>
                {value}{unit && `/${limit} ${unit}`}
            </div>
            <div style={{ fontSize: '0.7rem', color: isExceeded ? '#e63946' : '#2a9d8f', fontWeight: 800, textTransform: 'uppercase' }}>
                {status}
            </div>
        </div>
    );
};

export default ParameterChart;
