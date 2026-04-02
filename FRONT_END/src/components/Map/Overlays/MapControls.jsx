import React from 'react';
import { IconMap, IconPalette } from '../../Common/Icons';

/**
 * Map Controls Overlay (Zoom, Reset, Fullscreen, Export)
 */
export const MapControls = ({
    onResetView,
    onZoomIn,
    onZoomOut,
    onFullscreen,
    onToggleColorPicker,
    showColorPickerBtn,
    onExport // { type: 'current' | 'full' }
}) => {
    const [showExportMenu, setShowExportMenu] = React.useState(false);

    return (
        <div className="map-controls">
            <button className="map-control-btn" onClick={onResetView} title="Reset View">
                <IconMap />
            </button>
            <button className="map-control-btn" onClick={onZoomIn} title="Zoom In">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button className="map-control-btn" onClick={onZoomOut} title="Zoom Out">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button className="map-control-btn" onClick={onFullscreen} title="Toggle Fullscreen">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            </button>

            {/* Export Menu */}
            <div style={{ position: 'relative' }}>
                <button
                    className={`map-control-btn ${showExportMenu ? 'active' : ''}`}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    title="Download Map"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
                {showExportMenu && (
                    <div className="export-menu animated-fade-in">
                        <div className="export-option" onClick={() => { onExport('current'); setShowExportMenu(false); }}>
                            Download Current View
                        </div>
                        <div className="export-option" onClick={() => { onExport('full'); setShowExportMenu(false); }}>
                            Download Full State
                        </div>
                    </div>
                )}
            </div>

            {showColorPickerBtn && (
                <button
                    className={`map-control-btn ${onToggleColorPicker ? 'active' : ''}`}
                    onClick={onToggleColorPicker}
                    title="Change Layer Colors"
                    style={{ marginTop: '10px' }}
                >
                    <IconPalette />
                </button>
            )}
        </div>
    );
};
