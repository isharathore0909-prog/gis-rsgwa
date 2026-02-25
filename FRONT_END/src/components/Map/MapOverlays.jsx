import React from 'react';
import { IconMap, IconLayers, IconPalette } from '../Common/Icons';

/**
 * Map Controls Overlay (Zoom, Reset, Fullscreen)
 */
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

/**
 * Legend Toggle Button
 */
export const LegendToggle = ({
    isActive,
    showLegend,
    hasData,
    onToggle
}) => {
    if (!isActive || !hasData) return null;

    return (
        <div
            className={`map-legend-toggle ${showLegend ? 'active' : ''}`}
            onClick={onToggle}
        >
            <span style={{ color: showLegend ? '#ffffff' : '#64748b', display: 'flex' }}>
                <IconLayers />
            </span>
            <span className="toggle-text">Legend</span>
            <span className="toggle-icon">{showLegend ? '−' : '+'}</span>
        </div>
    );
};

/**
 * Legend Widget
 */
export const LegendWidget = ({
    isActive,
    showLegend,
    legendData,
    legendFeature,
    numClasses,
    featureOptions,
    onFeatureChange,
    onClassesChange,
    onHide
}) => {
    if (!isActive || !showLegend || !legendData.length) return null;

    return (
        <div className="legend-widget animated-fade-in">
            <div className="legend-header">
                <div className="header-left">
                    <span style={{ color: '#ffffff', display: 'flex' }}>
                        <IconLayers />
                    </span>
                    <h4>Legend</h4>
                </div>
                <button className="legend-hide-btn" onClick={onHide}>Hide</button>
            </div>

            <div className="legend-controls-row">
                <select
                    className="legend-select"
                    value={legendFeature}
                    onChange={e => onFeatureChange(e.target.value)}
                >
                    {featureOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="classes-selector">
                    <label>Steps</label>
                    <select
                        className="tiny-select"
                        value={numClasses}
                        onChange={e => onClassesChange(parseInt(e.target.value))}
                    >
                        {[3, 4, 5, 6, 7].map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="legend-items">
                {legendData.map((item, i) => (
                    <div key={i} className="legend-row">
                        <span
                            className="legend-swatch"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="legend-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Map Warning Overlay
 */
export const MapWarning = ({ layerType, isRainfallDataEmpty, isLoading }) => {
    const supportedLayers = [
        'Rainfall',
        'Water Resources',
        'Ground Water Resource Estimation',
        'Aquifer',
        'Water Quality',
        'Well Inventory',
        'Recharge Structure'
    ];

    if (isLoading) {
        return (
            <div className="map-warning-overlay animated-fade-in" style={{ top: '10%' }}>
                <div className="warning-content loading-content">
                    <div className="spinner-small"></div>
                    <div className="warning-text">
                        <h3>Loading Layer Data...</h3>
                        <p>Fetching spatial information for <strong>{layerType || 'Map'}</strong></p>
                    </div>
                </div>
            </div>
        );
    }

    if (layerType === 'Rainfall' && (!supportedLayers.includes(layerType) || isRainfallDataEmpty)) {
        return (
            <div className="map-warning-overlay animated-fade-in" style={{ top: '10%' }}>
                <div className="warning-content">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-text">
                        <h3>No Data Available</h3>
                        <p>
                            Rainfall data is not available for this selection.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!layerType || supportedLayers.includes(layerType)) return null;

    return (
        <div className="map-warning-overlay animated-fade-in">
            <div className="warning-content">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                    <h3>Map Visualization Not Available</h3>
                    <p>
                        Spatial data for <strong>{layerType}</strong> is currently being processed.
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * Color Picker Widget
 */
export const ColorPickerWidget = ({
    isActive,
    layerColors,
    onColorChange,
    onClose
}) => {
    if (!isActive) return null;

    return (
        <div className="color-picker-widget animated-fade-in">
            <div className="widget-header">
                <h4>Layer Colors</h4>
                <button onClick={onClose} className="close-btn">×</button>
            </div>
            <div className="widget-content">
                {Object.entries(layerColors).map(([key, color]) => (
                    <div key={key} className="color-option">
                        <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onColorChange(key, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
