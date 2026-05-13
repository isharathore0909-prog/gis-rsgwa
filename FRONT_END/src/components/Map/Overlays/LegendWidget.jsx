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
    onHide,
    clickedFeatureInfo,
    onDismissInfo
}) => {
    if (!isActive || !showLegend || !legendData.length) return null;

    // Only show the thematic controls (feature selector + steps) for layers
    // that actually support continuous/discretised classification.
    const showThematicControls = isActive === 'Rainfall' || isActive === 'Ground Water Resource Estimation';

    const formatCategory = (cat) => {
        if (!cat) return null;
        // Category is already normalized to Title Case (e.g., 'Over Exploited') by useValidatedBlockData
        return cat;
    };

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

            {clickedFeatureInfo && (
                <div className="legend-clicked-info">
                    <div className="legend-info-header">
                        <span className="legend-info-title">📍 Selected Area</span>
                        <button className="legend-info-dismiss" onClick={onDismissInfo} title="Dismiss">✕</button>
                    </div>
                    <div className="legend-info-body">
                        {clickedFeatureInfo.district && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">District</span>
                                <span className="legend-info-value">{clickedFeatureInfo.district}</span>
                            </div>
                        )}
                        {clickedFeatureInfo.block && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">Block</span>
                                <span className="legend-info-value">{clickedFeatureInfo.block}</span>
                            </div>
                        )}
                        {clickedFeatureInfo.loading && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">GW Status</span>
                                <span className="legend-info-value" style={{ fontStyle: 'italic', fontSize: '0.7rem', color: '#94a3b8' }}>
                                    Loading...
                                </span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && clickedFeatureInfo.category && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">GW Status</span>
                                <span
                                    className="legend-category-badge"
                                    style={{ backgroundColor: clickedFeatureInfo.categoryColor || '#94a3b8' }}
                                >
                                    {formatCategory(clickedFeatureInfo.category)}
                                </span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && !clickedFeatureInfo.category && clickedFeatureInfo.rainfall === undefined && clickedFeatureInfo.water_level === undefined && clickedFeatureInfo.aquifer === undefined && clickedFeatureInfo.water_resource === undefined && (
                            <div className="legend-info-row">
                                <span className="legend-info-label" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                                    No data mapped for this area
                                </span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && clickedFeatureInfo.rainfall !== undefined && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">Rainfall</span>
                                <span className="legend-info-value">{clickedFeatureInfo.rainfall}</span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && clickedFeatureInfo.water_level !== undefined && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">Water Level</span>
                                <span className="legend-info-value">{clickedFeatureInfo.water_level}</span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && clickedFeatureInfo.aquifer !== undefined && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">Aquifer</span>
                                <span className="legend-info-value">{clickedFeatureInfo.aquifer}</span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && clickedFeatureInfo.water_resource !== undefined && (
                            <div className="legend-info-row">
                                <span className="legend-info-label">Water Resource</span>
                                <span className="legend-info-value">{clickedFeatureInfo.water_resource}</span>
                            </div>
                        )}
                        {!clickedFeatureInfo.loading && clickedFeatureInfo.dam_details && (
                            <div className="dam-extra-info" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                {Object.entries(clickedFeatureInfo.dam_details).map(([k, v]) => v && (
                                    <div key={k} className="legend-info-row" style={{ minHeight: 'auto', marginBottom: '4px' }}>
                                        <span className="legend-info-label" style={{ opacity: 0.6 }}>{k}</span>
                                        <span className="legend-info-value" style={{ fontSize: '0.75rem' }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
