import React from 'react';

const WaterResourcesPreview = ({ data, analysisResults }) => {
    const stats = [
        { label: 'Dams', value: data.allDams?.length || 0, color: '#3b82f6' },
        { label: 'Canals', value: data.canalData?.total_count || data.canalData?.features?.length || data.canalData?.length || 0, color: '#0ea5e9' },
        { label: 'Waterbodies', value: data.water_resources?.total_count || data.water_resources?.features?.length || data.water_resources?.length || 0, color: '#2563eb' },
        { label: 'Recharge', value: analysisResults?.rechargeStats?.total_count || 0, color: '#1d4ed8' }
    ];

    const totalStructures = (data.allDams?.length || 0) +
        (data.canalData?.total_count || data.canalData?.features?.length || data.canalData?.length || 0) +
        (data.water_resources?.total_count || data.water_resources?.features?.length || data.water_resources?.length || 0) +
        (data.microData?.features?.length || data.microData?.length || 0) +
        (analysisResults?.rechargeStats?.total_count || 0);

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                width: '100%'
            }}>
                {stats.map((stat, idx) => (
                    <div key={idx} style={{
                        padding: '10px',
                        background: 'white',
                        borderRadius: '10px',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{stat.label}</span>
                        <span style={{ fontSize: '1.1rem', color: stat.color, fontWeight: '800' }}>{stat.value.toLocaleString()}</span>
                    </div>
                ))}
            </div>
            <div style={{
                padding: '12px',
                background: 'var(--primary-light)',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-dark)' }}>Total Structures</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary-dark)' }}>
                    {totalStructures.toLocaleString()}
                </span>
            </div>
        </div>
    );
};

export default WaterResourcesPreview;
