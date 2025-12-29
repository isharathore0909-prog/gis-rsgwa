import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import './DataAnalysisSidebar.css';
import { groundwaterData, getWellStatus } from '../data/groundwaterData';
import { rainfallData, getRainfallDataByDateRange } from '../data/rainfallData';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const DataAnalysisSidebar = ({ clickedLocation, neighbors }) => {
    const [timestep, setTimestep] = useState('Daily');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [groundwaterChartData, setGroundwaterChartData] = useState(null);
    const [rainfallChartData, setRainfallChartData] = useState(null);

    useEffect(() => {
        if (clickedLocation && neighbors && neighbors.length > 0) {
            updateCharts();
        } else {
            // Show default charts when no location is clicked
            showDefaultCharts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clickedLocation, neighbors, timestep, startDate, endDate]);

    const showDefaultCharts = () => {
        const waterLevels = groundwaterData.map(well => well.waterLevel);
        const wellIds = groundwaterData.map(well => well.id);

        setGroundwaterChartData({
            labels: wellIds,
            datasets: [{
                label: 'Water Level (m)',
                data: waterLevels,
                backgroundColor: 'rgba(30, 60, 114, 0.2)',
                borderColor: '#1e3c72',
                borderWidth: 2,
                tension: 0.4
            }]
        });

        // Default rainfall chart
        const rainfallStations = rainfallData.filter((rf, index, self) => 
            index === self.findIndex(r => r.id === rf.id)
        );
        setRainfallChartData({
            labels: rainfallStations.map(rf => rf.location),
            datasets: [{
                label: 'Rainfall (mm)',
                data: rainfallStations.map(rf => rf.rainfall),
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: '#28a745',
                borderWidth: 2,
                tension: 0.4
            }]
        });
    };

    const updateCharts = () => {
        if (!neighbors || neighbors.length === 0 || neighbors.length < 5) {
            // Need at least 5 neighbors
            setGroundwaterChartData(null);
            setRainfallChartData(null);
            return;
        }

        // Filter groundwater data for neighbors (min 5, max 10)
        const neighborIds = neighbors.map(n => n.id);
        const groundwaterNeighbors = groundwaterData.filter(gw => 
            neighborIds.includes(gw.id)
        );

        // Calculate mean groundwater level from neighboring stations
        const meanWaterLevel = groundwaterNeighbors.length > 0
            ? groundwaterNeighbors.reduce((sum, gw) => sum + gw.waterLevel, 0) / groundwaterNeighbors.length
            : 0;

        // Filter rainfall data for neighbors and date range
        let rainfallNeighbors = rainfallData.filter(rf => 
            neighbors.some(n => 
                Math.abs(n.lat - rf.lat) < 0.01 && Math.abs(n.lng - rf.lng) < 0.01
            )
        );

        if (startDate && endDate) {
            rainfallNeighbors = getRainfallDataByDateRange(rainfallNeighbors, startDate, endDate);
        }

        // Group rainfall data by date and calculate mean for each date
        const groupedByDate = {};
        rainfallNeighbors.forEach(rf => {
            if (!groupedByDate[rf.date]) {
                groupedByDate[rf.date] = [];
            }
            groupedByDate[rf.date].push(rf.rainfall);
        });

        const dates = Object.keys(groupedByDate).sort();
        const meanRainfallByDate = dates.map(date => {
            const values = groupedByDate[date];
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        // Calculate overall mean rainfall
        const overallMeanRainfall = rainfallNeighbors.length > 0
            ? rainfallNeighbors.reduce((sum, rf) => sum + rf.rainfall, 0) / rainfallNeighbors.length
            : 0;

        // Groundwater chart - Show mean value prominently
        setGroundwaterChartData({
            labels: ['Mean Analysis'],
            datasets: [{
                label: `Mean Water Level (${groundwaterNeighbors.length} stations)`,
                data: [meanWaterLevel],
                backgroundColor: 'rgba(30, 60, 114, 0.6)',
                borderColor: '#1e3c72',
                borderWidth: 2,
            }]
        });

        // Rainfall chart - Show mean rainfall over time
        if (dates.length > 0) {
            setRainfallChartData({
                labels: dates,
                datasets: [
                    {
                        label: 'Mean Rainfall (from neighbors)',
                        data: meanRainfallByDate,
                        backgroundColor: 'rgba(40, 167, 69, 0.2)',
                        borderColor: '#28a745',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Overall Mean',
                        data: Array(dates.length).fill(overallMeanRainfall),
                        borderColor: '#ffc107',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            });
        } else {
            // If no date range, show overall mean
            setRainfallChartData({
                labels: ['Mean Analysis'],
                datasets: [{
                    label: 'Mean Rainfall (from neighbors)',
                    data: [overallMeanRainfall],
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: '#28a745',
                    borderWidth: 2,
                }]
            });
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            },
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        }
    };

    const groundwaterChartOptions = {
        ...chartOptions,
        scales: {
            ...chartOptions.scales,
            y: {
                ...chartOptions.scales.y,
                title: {
                    display: true,
                    text: 'Water Level (meters)'
                }
            },
            x: {
                display: false
            }
        },
        plugins: {
            ...chartOptions.plugins,
            title: {
                display: true,
                text: 'Mean Groundwater Level (from neighboring stations)',
                font: {
                    size: 14
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Mean: ${context.parsed.y.toFixed(2)} m`;
                    }
                }
            }
        }
    };

    const rainfallChartOptions = {
        ...chartOptions,
        scales: {
            ...chartOptions.scales,
            y: {
                ...chartOptions.scales.y,
                title: {
                    display: true,
                    text: 'Rainfall (mm)'
                }
            },
            x: {
                ...chartOptions.scales.x,
                title: {
                    display: true,
                    text: 'Date'
                }
            }
        },
        plugins: {
            ...chartOptions.plugins,
            title: {
                display: true,
                text: 'Rainfall Analysis Over Time',
                font: {
                    size: 14
                }
            }
        }
    };

    return (
        <aside className="data-analysis-sidebar">
            <div className="sidebar-content">
                {clickedLocation && neighbors && neighbors.length > 0 ? (
                    <>
                        {/* Location Info */}
                        <div className="sidebar-section">
                            <h3>Location Analysis</h3>
                            <div className="location-info-box">
                                <p><strong>Clicked Location:</strong></p>
                                <p>{clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}</p>
                                <p><strong>Neighboring Stations Used:</strong> {neighbors.length} (Min: 5, Max: 10)</p>
                                {neighbors.length < 5 && (
                                    <p className="warning-text">⚠️ Warning: Need at least 5 stations for accurate analysis</p>
                                )}
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="sidebar-section">
                            <h3>Filters</h3>
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
                                <div className="date-inputs-vertical">
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

                        {/* Groundwater Chart */}
                        <div className="sidebar-section">
                            <h3>Groundwater Level Analysis</h3>
                            <div className="mean-info-box">
                                <p><strong>Mean Water Level:</strong> {
                                    neighbors && neighbors.length > 0 
                                        ? (groundwaterData
                                            .filter(gw => neighbors.map(n => n.id).includes(gw.id))
                                            .reduce((sum, gw) => sum + gw.waterLevel, 0) / 
                                           groundwaterData.filter(gw => neighbors.map(n => n.id).includes(gw.id)).length
                                          ).toFixed(2)
                                        : 'N/A'
                                } m</p>
                                <p className="info-text">Calculated from {neighbors.length} neighboring stations</p>
                            </div>
                            <div className="chart-container-sidebar">
                                {groundwaterChartData ? (
                                    <Bar data={groundwaterChartData} options={groundwaterChartOptions} />
                                ) : (
                                    <p className="no-data">Need at least 5 neighboring stations for analysis</p>
                                )}
                            </div>
                        </div>

                        {/* Rainfall Chart */}
                        <div className="sidebar-section">
                            <h3>Rainfall Analysis</h3>
                            <div className="mean-info-box">
                                <p><strong>Mean Rainfall:</strong> {
                                    neighbors && neighbors.length > 0
                                        ? (() => {
                                            const rfNeighbors = rainfallData.filter(rf => 
                                                neighbors.some(n => 
                                                    Math.abs(n.lat - rf.lat) < 0.01 && 
                                                    Math.abs(n.lng - rf.lng) < 0.01
                                                )
                                            );
                                            const filtered = startDate && endDate 
                                                ? getRainfallDataByDateRange(rfNeighbors, startDate, endDate)
                                                : rfNeighbors;
                                            return filtered.length > 0
                                                ? (filtered.reduce((sum, rf) => sum + rf.rainfall, 0) / filtered.length).toFixed(2)
                                                : 'N/A';
                                        })()
                                        : 'N/A'
                                } mm</p>
                                <p className="info-text">Calculated from {neighbors.length} neighboring stations</p>
                            </div>
                            <div className="chart-container-sidebar">
                                {rainfallChartData ? (
                                    <Line data={rainfallChartData} options={rainfallChartOptions} />
                                ) : (
                                    <p className="no-data">Need at least 5 neighboring stations for analysis</p>
                                )}
                            </div>
                        </div>

                        {/* Neighboring Stations Table */}
                        <div className="sidebar-section">
                            <h3>Neighboring Stations</h3>
                            <div className="data-table-container-sidebar">
                                <table className="data-table-sidebar">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Location</th>
                                            <th>Distance</th>
                                            <th>Water Level</th>
                                            <th>Rainfall</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {neighbors.map((neighbor, index) => {
                                            const gwData = groundwaterData.find(gw => gw.id === neighbor.id);
                                            const rfData = rainfallData.find(rf => 
                                                Math.abs(rf.lat - neighbor.lat) < 0.01 && 
                                                Math.abs(rf.lng - neighbor.lng) < 0.01
                                            );
                                            return (
                                                <tr key={index}>
                                                    <td>{neighbor.id}</td>
                                                    <td>{neighbor.location}</td>
                                                    <td>{neighbor.distance.toFixed(2)} km</td>
                                                    <td>{gwData?.waterLevel || 'N/A'} m</td>
                                                    <td>{rfData?.rainfall || 'N/A'} mm</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Default view when no location clicked */}
                        <div className="sidebar-section">
                            <h3>Water Level Chart</h3>
                            <div className="chart-container-sidebar">
                                {groundwaterChartData ? (
                                    <Bar data={groundwaterChartData} options={groundwaterChartOptions} />
                                ) : (
                                    <p className="no-data">No data available</p>
                                )}
                            </div>
                        </div>

                        <div className="sidebar-section">
                            <h3>Well Data Table</h3>
                            <div className="data-table-container-sidebar">
                                <table className="data-table-sidebar">
                                    <thead>
                                        <tr>
                                            <th>Well ID</th>
                                            <th>Location</th>
                                            <th>Level (m)</th>
                                            <th>pH</th>
                                            <th>TDS</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groundwaterData.map(well => {
                                            const status = getWellStatus(well);
                                            return (
                                                <tr key={well.id}>
                                                    <td>{well.id}</td>
                                                    <td>{well.location}</td>
                                                    <td>{well.waterLevel}</td>
                                                    <td>{well.ph}</td>
                                                    <td>{well.tds}</td>
                                                    <td><span className={`status-${status.class}`}>{status.text}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
};

export default DataAnalysisSidebar;
