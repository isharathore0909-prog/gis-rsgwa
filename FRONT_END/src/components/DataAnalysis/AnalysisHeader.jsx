import React from 'react';
import { IconChart } from '../Icons';

const AnalysisHeader = ({ displayRegion, isRainfall, subtitle }) => {
    // Detect if we are looking at a block or district
    const isBlock = displayRegion?.toLowerCase().includes('block');
    const label = isBlock ? 'Block Analysis:' : 'District Analysis:';

    return (
        <div className="sidebar-header-section">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-box-sm"><IconChart /></div>
                    {displayRegion ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                                {label}
                            </span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
                                {displayRegion.replace(/ block/i, '')}
                            </span>
                        </div>
                    ) : (
                        <h2>{isRainfall ? 'Rainfall Analysis' : 'Data Analysis'}</h2>
                    )}
                </div>
                {subtitle && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '2.75rem', fontWeight: 500 }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisHeader;
