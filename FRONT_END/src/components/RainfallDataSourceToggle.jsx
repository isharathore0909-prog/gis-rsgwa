import React from 'react';
import './RainfallDataSourceToggle.css';

/**
 * Toggle component to switch between village-based and station-based rainfall data
 */
const RainfallDataSourceToggle = ({ dataSource, onDataSourceChange, disabled = false }) => {
    return (
        <div className="rainfall-data-source-toggle">
            <label className="toggle-label-text">Rainfall Data Source:</label>
            <div className="toggle-buttons">
                <button
                    className={`toggle-btn ${dataSource === 'village' ? 'active' : ''}`}
                    onClick={() => onDataSourceChange('village')}
                    disabled={disabled}
                    title="Show village-based rainfall data"
                >
                    <span className="btn-icon">🏘️</span>
                    <span className="btn-text">Village</span>
                </button>
                <button
                    className={`toggle-btn ${dataSource === 'station' ? 'active' : ''}`}
                    onClick={() => onDataSourceChange('station')}
                    disabled={disabled}
                    title="Show rainfall station data"
                >
                    <span className="btn-icon">📡</span>
                    <span className="btn-text">Station</span>
                </button>
            </div>
        </div>
    );
};

export default RainfallDataSourceToggle;
