import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import './RechargeStructureSection.css';

const RechargeStructureSection = ({ displayRegion, displayBlock, stats, isLoading, isExpanded }) => {
    const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];

    const chartData = useMemo(() => {
        if (!stats || !stats.by_type) return [];
        return stats.by_type.map((item, i) => ({
            name: item.type,
            count: item.count,
            capacity: item.capacity,
            color: colors[i % colors.length]
        }));
    }, [stats]);

    if (isLoading) {
        return (
            <div className="recharge-section">
                <AnalysisCard style={{ textAlign: 'center', padding: '3rem', marginTop: '1rem' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Fetching recharge structure data...</p>
                </AnalysisCard>
            </div>
        );
    }

    if (!stats || stats.total_count === 0) {
        return (
            <div className="recharge-section">
                <AnalysisCard style={{ textAlign: 'center', padding: '2rem', marginTop: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
                    <h3 style={{ color: '#64748b' }}>No Data Available</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        No recharge structures found for <strong>{displayBlock || displayRegion || 'this area'}</strong>.
                    </p>

                    {stats?.total_available_in_db > 0 && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px dashed #e2e8f0'
                        }}>
                            Found {stats.total_available_in_db} records in total database, but none match the current location filter.
                        </div>
                    )}
                </AnalysisCard>
            </div>
        );
    }

    return (
        <div className={`recharge-section ${isExpanded ? 'is-expanded' : ''}`}>
            <div className="summary-stats-grid">
                <AnalysisCard className="summary-stat-card">
                    <div className="stat-icon">🏗️</div>
                    <div className="stat-content">
                        <span className="stat-label">Total Structures</span>
                        <span className="stat-value">{stats.total_count}</span>
                    </div>
                </AnalysisCard>
                <AnalysisCard className="summary-stat-card">
                    <div className="stat-icon">💧</div>
                    <div className="stat-content">
                        <span className="stat-label">Total Capacity</span>
                        <span className="stat-value">{stats.total_capacity.toLocaleString()} <small>m³</small></span>
                    </div>
                </AnalysisCard>
            </div>

            <AnalysisCard title="STRUCTURE DETAILS" className="full-width premium-recharge-card">
                <div className="recharge-table-container">
                    <table className="recharge-details-table">
                        <thead>
                            <tr>
                                <th>Structure Type</th>
                                <th style={{ textAlign: 'center' }}>No. of Structures</th>
                                <th style={{ textAlign: 'right' }}>Storage Capacity (m³)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.map((item, index) => (
                                <tr key={index}>
                                    <td className="type-cell">
                                        <span className="type-indicator" style={{ backgroundColor: item.color }}></span>
                                        {item.name}
                                    </td>
                                    <td className="count-cell">{item.count}</td>
                                    <td className="capacity-cell">{item.capacity.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </AnalysisCard>
        </div>

    );
};

export default RechargeStructureSection;
