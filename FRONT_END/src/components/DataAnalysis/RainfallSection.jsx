import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip, Legend, Cell
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';

const RainfallSection = ({
    view,
    setView,
    displayRegion,
    monsoonSummary,
    divisionData,
    chartData,
    perf2024,
    monthlyData,
    maxOneDayData
}) => {
    return (
        <>
            <div className="view-switcher animated-entry">
                <div
                    className={`view-tab ${view === 'state' ? 'active' : ''}`}
                    onClick={() => setView('state')}
                >
                    State Overview
                </div>
                <div
                    className={`view-tab ${view === 'district' ? 'active' : ''}`}
                    onClick={() => setView('district')}
                >
                    District Analysis
                </div>
            </div>

            {view === 'state' && (
                <div className="rainfall-grid animated-entry">
                    <AnalysisCard title="State Monsoon 2024 Overview">
                        <div className="status-summary-grid">
                            <MiniStatusCard value={monsoonSummary.onset} label="Onset Date" color="#2a9d8f" style={{ fontSize: '0.9rem' }} />
                            <MiniStatusCard value={monsoonSummary.withdrawal} label="Withdrawal" color="#e63946" style={{ fontSize: '0.9rem' }} />
                            <MiniStatusCard value="662.9 mm" label="Actual Rain" color="#457b9d" />
                            <MiniStatusCard value="+57.1%" label="Departure" color="#f4a261" />
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Highlights">
                        <div className="aquifer-details-list">
                            {monsoonSummary.highlights.map((h, i) => (
                                <div key={i} className="aquifer-detail-item" style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div className="detail-header">
                                        <span className="dot" style={{ backgroundColor: '#3b82f6', width: '6px', height: '6px' }}></span>
                                        <span className="name" style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#475569' }}>{h}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Graph 01: Monthly Performance (%)">
                        <div className="bar-chart-wrapper">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={monsoonSummary.monthly_performance}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="percent" name="% of Normal" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Graph 03: Division-wise Rainfall">
                        <div className="bar-chart-wrapper">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={divisionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} height={60} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar dataKey="normal" name="Normal" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="actual" name="Actual" fill="#2a9d8f" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Graph 04 & 05: Regional Trends (10 Yr)">
                        <div className="bar-chart-wrapper">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={[
                                    { region: 'Western', actual: 485.2, normal: 276.5 },
                                    { region: 'Eastern', actual: 911.4, normal: 624.4 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="normal" name="Normal LPA" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="actual" name="2024 Actual" fill="#2a9d8f" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>
                </div>
            )}

            {view === 'district' && (
                <div className="rainfall-grid animated-entry">
                    {displayRegion ? (
                        <>
                            <AnalysisCard title="Rainfall Trends (2020-2024)" style={{ gridColumn: '1 / -1' }}>
                                <div className="bar-chart-wrapper">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Legend />
                                            <Bar dataKey="premonsoon" name="Pre-Monsoon" fill="#f4a261" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="monsoon" name="Monsoon" fill="#2a9d8f" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="annual" name="Annual Total" fill="#457b9d" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </AnalysisCard>

                            {perf2024 && (
                                <>
                                    <AnalysisCard title="2024 Monsoon Performance">
                                        <div className="bar-chart-wrapper">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={perf2024} layout="vertical" margin={{ left: 40, right: 30 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fontWeight: 600 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                        {perf2024.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="quality-legend-simple">
                                            <div className="legend-label">
                                                Performance: {((perf2024[1].value / perf2024[0].value) * 100).toFixed(0)}% of Normal LPA
                                            </div>
                                        </div>
                                    </AnalysisCard>

                                    <AnalysisCard title="Annexure-C: Monthly Breakup (2024)">
                                        <div className="bar-chart-wrapper">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={monthlyData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" name="Rainfall (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </AnalysisCard>

                                    {maxOneDayData.length > 0 && (
                                        <AnalysisCard title="Annexure-D: Max One Day Rain (>100mm)" style={{ gridColumn: '1 / -1' }}>
                                            <div className="aquifer-details-list">
                                                {maxOneDayData.map((record, idx) => (
                                                    <div key={idx} className="aquifer-detail-item">
                                                        <div className="detail-header">
                                                            <span className="dot" style={{ backgroundColor: '#ef4444' }}></span>
                                                            <span className="name">{record.station}</span>
                                                        </div>
                                                        <div className="detail-stats">
                                                            <span className="area">{record.amount} <small>mm</small></span>
                                                            <span className="percent" style={{ fontSize: '0.7rem' }}>{record.date}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AnalysisCard>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <AnalysisCard style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                            <h3 style={{ color: '#64748b' }}>Select a District on the Map</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Click any district to view detailed rainfall analysis for that region.</p>
                        </AnalysisCard>
                    )}
                </div>
            )}
        </>
    );
};

export default RainfallSection;
