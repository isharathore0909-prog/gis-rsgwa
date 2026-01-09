import React from 'react';
import { IconChart } from '../Icons';

const AnalysisHeader = ({ displayRegion, analysisLevel, isRainfall, selectedLayer, subtitle }) => {
    // Generate label based on analysis level
    let label = 'Analysis:';
    if (analysisLevel) {
        label = analysisLevel === 'State' ? 'State Overview:' : `${analysisLevel} Analysis:`;
    } else {
        // Fallback checks
        const isBlock = displayRegion?.toLowerCase().includes('block');
        label = isBlock ? 'Block Analysis:' : 'District Analysis:';
    }

    return (
        <div className="sidebar-header-section">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="icon-box-sm"><IconChart /></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                            <h2 style={{ margin: 0 }}>{isRainfall ? 'Rainfall Analysis' : 'Data Analysis'}</h2>
                        )}
                        {selectedLayer && (
                            <div style={{
                                fontSize: '0.75rem',
                                marginTop: '0.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span style={{
                                    backgroundColor: '#eff6ff',
                                    color: '#3b82f6',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    border: '1px solid #dbeafe',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.025em'
                                }}>
                                    {selectedLayer}
                                </span>
                            </div>
                        )}
                    </div>
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
