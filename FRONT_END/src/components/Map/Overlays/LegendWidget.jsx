import React from 'react';
import { IconLayers } from '../../Common/Icons';

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

    // Only show the thematic controls (feature selector + steps) for layers
    // that actually support continuous/discretised classification.
    const showThematicControls = isActive === 'Rainfall';

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

            {showThematicControls && (
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
            )}

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
