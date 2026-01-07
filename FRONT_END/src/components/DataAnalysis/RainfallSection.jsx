import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';

const RainfallSection = ({
    displayRegion,
    rainfallStats,
    rainfallPoints = [],
    viewType: propViewType = 'monthly'
}) => {
    // Normalize viewType to lowercase (e.g., 'Daily' -> 'daily')
    const viewType = propViewType.toLowerCase();

    const aggregatedData = useMemo(() => {
        if (!rainfallPoints || !Array.isArray(rainfallPoints) || rainfallPoints.length === 0) return [];

        if (viewType === 'daily') {
            const grouped = rainfallPoints.reduce((acc, curr) => {
                const date = curr.date || curr.rainfall_date;
                if (!acc[date]) acc[date] = { name: date, total: 0 };
                acc[date].total += (curr.rainfall_mm || curr.rainfall_in_mm || 0);
                return acc;
            }, {});
            return Object.values(grouped).sort((a, b) => new Date(a.name) - new Date(b.name));
        }

        if (viewType === 'monthly') {
            const grouped = rainfallPoints.reduce((acc, curr) => {
                const date = new Date(curr.date || curr.rainfall_date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!acc[monthKey]) acc[monthKey] = { name: monthKey, total: 0 };
                acc[monthKey].total += (curr.rainfall_mm || curr.rainfall_in_mm || 0);
                return acc;
            }, {});
            return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
        }

        if (viewType === 'yearly') {
            const grouped = rainfallPoints.reduce((acc, curr) => {
                const date = new Date(curr.date || curr.rainfall_date);
                const yearKey = `${date.getFullYear()}`;
                if (!acc[yearKey]) acc[yearKey] = { name: yearKey, total: 0 };
                acc[yearKey].total += (curr.rainfall_mm || curr.rainfall_in_mm || 0);
                return acc;
            }, {});
            return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
        }

        return [];
    }, [rainfallPoints, viewType]);

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
                    <MiniStatusCard value={`${rainfallStats.avg} mm`} label="Avg Reading" color="#457b9d" />
                    <MiniStatusCard value={`${rainfallStats.count}`} label="Total Records" color="#6366f1" />
                    <MiniStatusCard value={`${rainfallStats.max} mm`} label="Highest Record" color="#f4a261" />
                </div>
            </AnalysisCard>

            <AnalysisCard title={`${viewType.toUpperCase()} Rainfall Trend`}>
                <div className="bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={aggregatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 9 }}
                                tickFormatter={(val) => {
                                    if (viewType === 'daily') return val.split('-').slice(1).join('/');
                                    return val;
                                }}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="total" name="Total Rain (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </AnalysisCard>

            <AnalysisCard title="Highest Recorded Sample">
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
        </div>
    );
};

export default RainfallSection;
