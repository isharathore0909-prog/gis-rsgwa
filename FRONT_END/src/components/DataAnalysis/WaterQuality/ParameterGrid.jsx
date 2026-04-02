import React from 'react';
import ParameterChart from '../Common/ParameterChart';

const paramsList = [
    { key: 'ec', name: 'EC', limit: 3000, unit: 'µS/cm' },
    { key: 'fluoride', name: 'Fluoride', limit: 1.5, unit: 'mg/l' },
    { key: 'nitrate', name: 'Nitrate', limit: 45, unit: 'mg/l' },
    { key: 'iron', name: 'Iron', limit: 1.0, unit: 'mg/l' },
    { key: 'arsenic', name: 'Arsenic', limit: 10, unit: 'µg/l' },
    { key: 'uranium', name: 'Uranium', limit: 30, unit: 'µg/l' },
    { key: 'tds', name: 'TDS', limit: 2000, unit: 'mg/l' },
    { key: 'ph', name: 'pH', limit: 8.5, unit: '', range: [6.5, 8.5] },
    { key: 'chloride', name: 'Chloride', limit: 1000, unit: 'mg/l' },
    { key: 'hardness', name: 'Hardness', limit: 600, unit: 'mg/l' }
];

const ParameterGrid = ({ blockWaterQualityData }) => {
    const visibleParams = paramsList.filter(p => {
        const val = blockWaterQualityData[p.key];
        return val !== undefined && val !== null && val !== 0;
    });

    if (visibleParams.length === 0) {
        return (
            <div className="no-data-message" style={{
                textAlign: 'center', padding: '2rem', color: '#64748b',
                gridColumn: '1 / -1', background: '#f8fafc',
                borderRadius: '8px', border: '1px dashed #cbd5e1'
            }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No specific parameter data recorded for this location.</p>
            </div>
        );
    }

    return (
        <>
            <div className="water-quality-parameter-grid">
                {visibleParams.map(param => {
                    const value = blockWaterQualityData[param.key];
                    let status;
                    if (param.key === 'ph') {
                        status = (value >= param.range[0] && value <= param.range[1]) ? 'Normal' : 'Out Range';
                    } else {
                        status = value > param.limit ? 'High' : 'Safe';
                    }
                    return (
                        <ParameterChart
                            key={param.key}
                            name={param.name}
                            value={value}
                            limit={param.limit}
                            unit={param.unit}
                            status={status}
                        />
                    );
                })}
            </div>
            <div className="quality-legend-simple full-width" style={{ marginTop: '1.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a9d8f' }}></span>
                        <span>Safe / Normal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                        <span>High / Out of Range</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ParameterGrid;
