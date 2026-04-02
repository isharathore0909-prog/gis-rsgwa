import React from 'react';

/**
 * Export Loading Overlay
 */
export const ExportLoadingOverlay = ({ isActive }) => {
    if (!isActive) return null;

    return (
        <div className="map-loading-overlay-full" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            color: '#1e293b',
            animation: 'fadeIn 0.3s ease-out forwards'
        }}>
            <div className="export-loading-card" style={{
                background: '#ffffff',
                padding: '40px 60px',
                borderRadius: '24px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                maxWidth: '500px',
                width: '90%'
            }}>
                <div className="spinner-large" style={{
                    width: '64px',
                    height: '64px',
                    border: '5px solid rgba(15, 23, 42, 0.05)',
                    borderLeftColor: '#0ea5e9',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '30px'
                }}></div>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '12px', color: '#0f172a' }}>
                        Generating Geospatial PDF
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '24px' }}>
                        Please wait while our server renders your high-resolution map report...
                    </p>

                    <div style={{
                        padding: '12px 24px',
                        backgroundColor: 'rgba(14, 165, 233, 0.08)',
                        borderRadius: '30px',
                        border: '1px solid rgba(14, 165, 233, 0.15)',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#0369a1',
                        display: 'inline-block'
                    }}>
                        ⏱️ Est. Time: 10-20 seconds
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}} />
        </div>
    );
};
