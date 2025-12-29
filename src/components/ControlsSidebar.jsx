import React from 'react';
import './ControlsSidebar.css';
import { groundwaterData } from '../data/groundwaterData';

const ControlsSidebar = ({ 
    layers, 
    onLayerChange, 
    timePeriod, 
    onTimePeriodChange,
    parameter,
    onParameterChange
}) => {
    // Calculate statistics
    const totalWells = groundwaterData.length;
    const avgLevel = (groundwaterData.reduce((sum, well) => sum + well.waterLevel, 0) / totalWells).toFixed(2);
    const avgStatus = avgLevel < 10 ? 'good' : avgLevel < 15 ? 'warning' : 'critical';
    const statusText = avgLevel < 10 ? 'Good' : avgLevel < 15 ? 'Warning' : 'Critical';

    return (
        <aside className="controls-sidebar">
            <div className="sidebar-content">
                <div className="sidebar-section">
                    <h3>Layer Controls</h3>
                    <div className="layer-controls">
                        <label className="checkbox-label">
                            <input 
                                type="checkbox" 
                                checked={layers.wells}
                                onChange={(e) => onLayerChange('wells', e.target.checked)}
                            />
                            <span>Monitoring Wells</span>
                        </label>
                        <label className="checkbox-label">
                            <input 
                                type="checkbox" 
                                checked={layers.contours}
                                onChange={(e) => onLayerChange('contours', e.target.checked)}
                            />
                            <span>Water Level Contours</span>
                        </label>
                        <label className="checkbox-label">
                            <input 
                                type="checkbox" 
                                checked={layers.quality}
                                onChange={(e) => onLayerChange('quality', e.target.checked)}
                            />
                            <span>Water Quality Zones</span>
                        </label>
                        <label className="checkbox-label">
                            <input 
                                type="checkbox" 
                                checked={layers.satellite}
                                onChange={(e) => onLayerChange('satellite', e.target.checked)}
                            />
                            <span>Satellite Imagery</span>
                        </label>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Time Period</h3>
                    <select 
                        id="time-period" 
                        className="select-input"
                        value={timePeriod}
                        onChange={(e) => onTimePeriodChange(e.target.value)}
                    >
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                    </select>
                </div>

                <div className="sidebar-section">
                    <h3>Parameters</h3>
                    <select 
                        id="parameter-select" 
                        className="select-input"
                        value={parameter}
                        onChange={(e) => onParameterChange(e.target.value)}
                    >
                        <option value="water-level">Water Level (m)</option>
                        <option value="ph">pH</option>
                        <option value="tds">Total Dissolved Solids</option>
                        <option value="nitrate">Nitrate (mg/L)</option>
                        <option value="fluoride">Fluoride (mg/L)</option>
                    </select>
                </div>

                <div className="sidebar-section">
                    <h3>Statistics</h3>
                    <div className="stats-panel">
                        <div className="stat-item">
                            <span className="stat-label">Total Wells:</span>
                            <span className="stat-value">{totalWells}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Avg. Water Level:</span>
                            <span className="stat-value">{avgLevel} m</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Status:</span>
                            <span className={`stat-value status-${avgStatus}`}>{statusText}</span>
                        </div>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Tools</h3>
                    <div className="tool-buttons">
                        <button className="tool-btn" onClick={() => alert('Draw tool - Feature coming soon!')}>
                            📐 Draw Area
                        </button>
                        <button className="tool-btn" onClick={() => alert('Measure tool - Feature coming soon!')}>
                            📏 Measure
                        </button>
                        <button className="tool-btn" onClick={() => {
                            const csvContent = [
                                ['Well ID', 'Location', 'Latitude', 'Longitude', 'Water Level (m)', 'pH', 'TDS (mg/L)', 'Nitrate (mg/L)', 'Fluoride (mg/L)'],
                                ...groundwaterData.map(well => [
                                    well.id,
                                    well.location,
                                    well.lat,
                                    well.lng,
                                    well.waterLevel,
                                    well.ph,
                                    well.tds,
                                    well.nitrate,
                                    well.fluoride
                                ])
                            ].map(row => row.join(',')).join('\n');
                            
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'groundwater_data.csv';
                            a.click();
                            window.URL.revokeObjectURL(url);
                        }}>
                            💾 Export Data
                        </button>
                        <button className="tool-btn" onClick={() => window.print()}>
                            🖨️ Print Map
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default ControlsSidebar;

