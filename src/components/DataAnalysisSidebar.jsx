import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import './DataAnalysisSidebar.css';
import { groundwaterData, getWellStatus, getWaterLevelColor } from '../data/groundwaterData';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const DataAnalysisSidebar = () => {
    // Chart data
    const waterLevels = groundwaterData.map(well => well.waterLevel);
    const wellIds = groundwaterData.map(well => well.id);

    const chartData = {
        labels: wellIds,
        datasets: [{
            label: 'Water Level (m)',
            data: waterLevels,
            backgroundColor: waterLevels.map(level => getWaterLevelColor(level)),
            borderColor: '#1e3c72',
            borderWidth: 1
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Water Level (meters)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Well ID'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Groundwater Level Analysis',
                font: {
                    size: 14
                }
            }
        }
    };

    return (
        <aside className="data-analysis-sidebar">
            <div className="sidebar-content">
                <div className="sidebar-section">
                    <h3>Water Level Chart</h3>
                    <div className="chart-container-sidebar">
                        <Bar data={chartData} options={chartOptions} />
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
            </div>
        </aside>
    );
};

export default DataAnalysisSidebar;

