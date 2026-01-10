import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';

const RainfallSection = ({
    displayRegion,
    analysisLevel,
    rainfallStats,
    rainfallPoints = [],
    viewType: propViewType = 'monthly',
    isExpanded
}) => {
    // Normalize viewType to lowercase (e.g., 'Daily' -> 'daily')
    const viewType = propViewType.toLowerCase();

    const aggregatedData = useMemo(() => {
        if (!rainfallPoints || !Array.isArray(rainfallPoints) || rainfallPoints.length === 0) return [];

        // Check if data is already aggregated by backend (contains 'name' and 'total' properties)
        const isPreAggregated = rainfallPoints[0].name && rainfallPoints[0].total !== undefined && !rainfallPoints[0].date && !rainfallPoints[0].rainfall_mm;
        if (isPreAggregated) return rainfallPoints;

        if (viewType === 'daily') {
            const grouped = rainfallPoints.reduce((acc, curr) => {
                const date = curr.date || curr.rainfall_date;
                if (!acc[date]) acc[date] = { name: date, total: 0, count: 0 };
                acc[date].total += (curr.rainfall_mm || curr.rainfall_in_mm || 0);
                acc[date].count += 1;
                return acc;
            }, {});
            return Object.values(grouped).map(d => ({ ...d, average: parseFloat((d.total / d.count).toFixed(2)) })).sort((a, b) => new Date(a.name) - new Date(b.name));
        }

        if (viewType === 'monthly') {
            const grouped = rainfallPoints.reduce((acc, curr) => {
                const date = new Date(curr.date || curr.rainfall_date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!acc[monthKey]) acc[monthKey] = { name: monthKey, total: 0, count: 0 };
                acc[monthKey].total += (curr.rainfall_mm || curr.rainfall_in_mm || 0);
                acc[monthKey].count += 1;
                return acc;
            }, {});
            return Object.values(grouped).map(d => ({ ...d, average: parseFloat((d.total / d.count).toFixed(2)) })).sort((a, b) => a.name.localeCompare(b.name));
        }

        if (viewType === 'yearly') {
            const grouped = rainfallPoints.reduce((acc, curr) => {
                const date = new Date(curr.date || curr.rainfall_date);
                const yearKey = `${date.getFullYear()}`;
                if (!acc[yearKey]) acc[yearKey] = { name: yearKey, total: 0, count: 0 };
                acc[yearKey].total += (curr.rainfall_mm || curr.rainfall_in_mm || 0);
                acc[yearKey].count += 1;
                return acc;
            }, {});
            return Object.values(grouped).map(d => ({ ...d, average: parseFloat((d.total / d.count).toFixed(2)) })).sort((a, b) => a.name.localeCompare(b.name));
        }

        return [];
    }, [rainfallPoints, viewType]);

    if (propViewType === 'loading' || (!rainfallStats && rainfallPoints.length === 0)) {
        return (
            <div className="rainfall-grid animated-entry">
                <AnalysisCard style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌧️</div>
                    <h3 style={{ color: '#64748b' }}>Data Not Available</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Data is not available. Please select another location.
                    </p>
                </AnalysisCard>
            </div>
        );
    }

    return (
        <div className="rainfall-grid animated-entry">
            <AnalysisCard title={`Rainfall Overview: ${analysisLevel === 'State' ? 'Statewide' : displayRegion}`}>
                <div className="status-summary-grid">
                    {/* For Statewide/Regionwide view (no specific block), show Average Rainfall (of stations) instead of Sum which is meaningless */}
                    {(analysisLevel === 'State' || displayRegion === 'Rajasthan' || displayRegion === 'Statewide') ? (
                        <MiniStatusCard
                            value={`${rainfallStats.avg_station_total || rainfallStats.avg} mm`}
                            label="Average Rainfall"
                            color="#2a9d8f"
                        />
                    ) : (
                        <MiniStatusCard value={`${rainfallStats.total} mm`} label="Total Recorded" color="#2a9d8f" />
                    )}

                    <MiniStatusCard value={`${rainfallStats.avg} mm`} label="Avg Reading" color="#457b9d" />
                    <MiniStatusCard value={`${rainfallStats.count}`} label="Total Records" color="#6366f1" />
                    <MiniStatusCard value={`${rainfallStats.max} mm`} label="Highest Record" color="#f4a261" />
                </div>
            </AnalysisCard>

            <AnalysisCard title={`${viewType.toUpperCase()} Rainfall Trend (Average)`}>
                <div className="bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height={isExpanded ? 320 : 240}>
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
                            <Bar dataKey="average" name="Avg Rain (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </AnalysisCard>

            <AnalysisCard title="Highest Recorded Sample">
                {rainfallStats.maxVillage ? (
                    <div style={{ padding: '0 1rem 1rem 1rem' }}>
                        {/* Hero Value */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1.5rem 0',
                            borderBottom: '1px solid #f1f5f9',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span style={{
                                    fontSize: '2.75rem',
                                    fontWeight: '800',
                                    color: '#0ea5e9',
                                    lineHeight: '1',
                                    letterSpacing: '-1px'
                                }}>
                                    {rainfallStats.max}
                                </span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginLeft: '6px'
                                }}>
                                    mm
                                </span>
                            </div>
                            <span style={{
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                marginTop: '0.5rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Maximum Recorded
                            </span>
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></span>
                                    Location
                                </span>
                                <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '600' }}>
                                    {rainfallStats.maxVillage}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6366f1' }}></span>
                                    Date
                                </span>
                                <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '600' }}>
                                    {rainfallStats.maxDate}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        No record available for this selection
                    </div>
                )}
            </AnalysisCard>
        </div>
    );
};

export default RainfallSection;
