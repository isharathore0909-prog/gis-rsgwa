import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';

const RainfallSection = ({
    displayRegion,
    rainfallStats,
    rainfallPoints = []
}) => {
    if (!rainfallStats || rainfallPoints.length === 0) {
        return (
            <div className="rainfall-grid animated-entry">
                <AnalysisCard style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌧️</div>
                    <h3 style={{ color: '#64748b' }}>No Database Data Found</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        There are no rainfall records in the database for the selected period/region.
                    </p>
                </AnalysisCard>
            </div>
        );
    }

    return (
        <div className="rainfall-grid animated-entry">
            <AnalysisCard title={`Rainfall Overview: ${displayRegion || 'All Stations'}`}>
                <div className="status-summary-grid">
                    <MiniStatusCard value={`${rainfallStats.total} mm`} label="Total Recorded" color="#2a9d8f" />
                    <MiniStatusCard value={`${rainfallStats.avg} mm`} label="Daily Average" color="#457b9d" />
                    <MiniStatusCard value={`${rainfallStats.count}`} label="Total Records" color="#6366f1" />
                    <MiniStatusCard value={`${rainfallStats.max} mm`} label="Highest Record" color="#f4a261" />
                </div>
            </AnalysisCard>

            <AnalysisCard title="Highest Rainfall Station">
                <div className="aquifer-details-list">
                    <div className="aquifer-detail-item" style={{ padding: '12px 0' }}>
                        <div className="detail-header">
                            <span className="dot" style={{ backgroundColor: '#ef4444' }}></span>
                            <span className="name" style={{ fontWeight: 600 }}>{rainfallStats.maxVillage}</span>
                        </div>
                        <div className="detail-stats">
                            <span className="area" style={{ color: '#ef4444' }}>{rainfallStats.max} <small>mm</small></span>
                            <span className="percent">{rainfallStats.maxDate}</span>
                        </div>
                    </div>
                </div>
            </AnalysisCard>

            <AnalysisCard title="Daily Rainfall Trend (Database)">
                <div className="bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={rainfallStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="total" name="Total Rain (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </AnalysisCard>

            <AnalysisCard title="Recent Records (Last 5)">
                <div className="aquifer-details-list">
                    {rainfallPoints.slice(0, 5).map((record, idx) => (
                        <div key={idx} className="aquifer-detail-item" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <div className="detail-header">
                                <span className="dot" style={{ backgroundColor: record.rainfall_mm > 0 ? '#3b82f6' : '#cbd5e1' }}></span>
                                <span className="name" style={{ fontSize: '0.85rem' }}>{record.village_name}</span>
                            </div>
                            <div className="detail-stats">
                                <span className="area" style={{ fontSize: '0.9rem' }}>{record.rainfall_mm} <small>mm</small></span>
                                <span className="percent" style={{ fontSize: '0.7rem' }}>{record.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </AnalysisCard>
        </div>
    );
};

export default RainfallSection;
