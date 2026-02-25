import React, { useMemo } from 'react';

const HydrographDataTable = ({ data, showRainfall = true }) => {
    const tableData = useMemo(() => {
        if (!data || data.length === 0) return null;
        return data;
    }, [data]);

    if (!tableData) return null;

    return (
        <div className="hydrograph-data-table-wrapper" style={{ marginTop: '10px', overflowX: 'auto' }}>
            <table className="hydrograph-data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Years</th>
                        {tableData.map(d => <th key={d.year} style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{d.year}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {showRainfall && (
                        <tr>
                            <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600, color: '#3b82f6' }}>Annual Rainfall (m)</td>
                            {tableData.map(d => <td key={d.year} style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{d['Annual Rainfall'] != null ? d['Annual Rainfall'].toFixed(3) : '-'}</td>)}
                        </tr>
                    )}
                    <tr>
                        <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600, color: '#6366f1' }}>Avg Water Level (m)</td>
                        {tableData.map(d => {
                            const avgVal = d[`avg_${d.year}`] ?? d['Average Water Level'];
                            return <td key={d.year} style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{avgVal != null ? parseFloat(avgVal).toFixed(2) : '-'}</td>;
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default React.memo(HydrographDataTable);
