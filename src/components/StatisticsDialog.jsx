import React, { useState, useEffect } from 'react';
import './StatisticsDialog.css';
import { calculateStatistics } from '../data/rainfallData';
import { groundwaterData } from '../data/groundwaterData';
import { rainfallData, getRainfallDataByDateRange } from '../data/rainfallData';

const StatisticsDialog = ({ isOpen, onClose, clickedLocation, neighbors }) => {
    const [timestep, setTimestep] = useState('Daily');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statistics, setStatistics] = useState({ groundwater: null, rainfall: null });

    useEffect(() => {
        if (isOpen && neighbors && neighbors.length > 0) {
            calculateStats();
        }
    }, [isOpen, timestep, startDate, endDate, neighbors]);

    const calculateStats = () => {
        // Filter groundwater data for neighbors
        const neighborIds = neighbors.map(n => n.id);
        const groundwaterNeighbors = groundwaterData.filter(gw => 
            neighborIds.some(id => gw.id === id)
        );

        // Filter rainfall data for neighbors and date range
        let rainfallNeighbors = rainfallData.filter(rf => 
            neighbors.some(n => 
                Math.abs(n.lat - rf.lat) < 0.01 && Math.abs(n.lng - rf.lng) < 0.01
            )
        );

        if (startDate && endDate) {
            rainfallNeighbors = getRainfallDataByDateRange(rainfallNeighbors, startDate, endDate);
        }

        // Calculate statistics
        const gwStats = calculateStatistics(groundwaterNeighbors, 'groundwater');
        const rfStats = calculateStatistics(rainfallNeighbors, 'rainfall');

        setStatistics({
            groundwater: gwStats,
            rainfall: rfStats
        });
    };

    if (!isOpen) return null;

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>Location Statistics</h2>
                    <button className="dialog-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="dialog-body">
                    <div className="location-info">
                        <p><strong>Clicked Location:</strong> {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}</p>
                        <p><strong>Neighboring Stations Found:</strong> {neighbors?.length || 0}</p>
                    </div>

                    <div className="filter-section">
                        <div className="filter-group">
                            <label>Timestep</label>
                            <select 
                                className="filter-select"
                                value={timestep}
                                onChange={(e) => setTimestep(e.target.value)}
                            >
                                <option value="Daily">Daily</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Yearly">Yearly</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Date Range</label>
                            <div className="date-inputs">
                                <input 
                                    type="date"
                                    className="date-input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    placeholder="Start Date"
                                />
                                <span className="date-separator">to</span>
                                <input 
                                    type="date"
                                    className="date-input"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    placeholder="End Date"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="statistics-section">
                        <h3>Groundwater Statistics</h3>
                        {statistics.groundwater ? (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Mean</div>
                                    <div className="stat-value">{statistics.groundwater.mean} m</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Minimum</div>
                                    <div className="stat-value">{statistics.groundwater.min} m</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Maximum</div>
                                    <div className="stat-value">{statistics.groundwater.max} m</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Std Deviation</div>
                                    <div className="stat-value">{statistics.groundwater.stdDev} m</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Count</div>
                                    <div className="stat-value">{statistics.groundwater.count}</div>
                                </div>
                            </div>
                        ) : (
                            <p className="no-data">No data available</p>
                        )}

                        <h3>Rainfall Statistics</h3>
                        {statistics.rainfall ? (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Mean</div>
                                    <div className="stat-value">{statistics.rainfall.mean} mm</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Minimum</div>
                                    <div className="stat-value">{statistics.rainfall.min} mm</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Maximum</div>
                                    <div className="stat-value">{statistics.rainfall.max} mm</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Std Deviation</div>
                                    <div className="stat-value">{statistics.rainfall.stdDev} mm</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Count</div>
                                    <div className="stat-value">{statistics.rainfall.count}</div>
                                </div>
                            </div>
                        ) : (
                            <p className="no-data">No data available</p>
                        )}
                    </div>

                    <div className="neighbors-list">
                        <h3>Neighboring Stations</h3>
                        <div className="neighbors-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Location</th>
                                        <th>Distance (km)</th>
                                        <th>Water Level (m)</th>
                                        <th>Rainfall (mm)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {neighbors?.map((neighbor, index) => {
                                        const gwData = groundwaterData.find(gw => gw.id === neighbor.id);
                                        const rfData = rainfallData.find(rf => 
                                            Math.abs(rf.lat - neighbor.lat) < 0.01 && 
                                            Math.abs(rf.lng - neighbor.lng) < 0.01
                                        );
                                        return (
                                            <tr key={index}>
                                                <td>{neighbor.id}</td>
                                                <td>{neighbor.location}</td>
                                                <td>{neighbor.distance.toFixed(2)}</td>
                                                <td>{gwData?.waterLevel || 'N/A'}</td>
                                                <td>{rfData?.rainfall || 'N/A'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticsDialog;

