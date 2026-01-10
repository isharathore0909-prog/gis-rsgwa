import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import api from '../../api';
import './WellInventorySection.css';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '10px' }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const WellInventorySection = ({
    displayRegion,
    displayBlock,
    analysisLevel,
    globalFilters,
    selectedWell,
    isExpanded
}) => {
    const [loading, setLoading] = useState(false);
    const [listData, setListData] = useState([]); // Data for aggregation
    const [error, setError] = useState(null);

    // Fetch List Data ONLY if not already loaded or if filters changed
    useEffect(() => {
        // If we have a selected well, we don't necessarily need to reload listData unless it's empty
        // But if filters change, we MUST reload listData
        // We removed !displayRegion check to allow global stats

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    detailed: 'true'
                };

                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                console.log("WellInventorySection: Fetching with params:", params);
                const response = await api.aquifer.getRecords(params);
                console.log("WellInventorySection: Response:", response);

                const records = Array.isArray(response) ? response : (response.results || []);
                setListData(records);
            } catch (err) {
                console.error("Error fetching well inventory:", err);
                setError("Failed to load well inventory data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [displayRegion, displayBlock, globalFilters]);

    // Prepare Aggregated Chart Data (Average Water Levels)
    const aggregatedChartData = useMemo(() => {
        if (!listData || listData.length === 0) return [];

        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => {
            let preSum = 0;
            let preCount = 0;
            let pstSum = 0;
            let pstCount = 0;

            listData.forEach(record => {
                const preVal = record[`pre_${year}`];
                const pstVal = record[`pst_${year}`];

                if (preVal !== null && preVal !== undefined) {
                    preSum += parseFloat(preVal);
                    preCount++;
                }
                if (pstVal !== null && pstVal !== undefined) {
                    pstSum += parseFloat(pstVal);
                    pstCount++;
                }
            });

            return {
                year: year.toString(),
                'Pre-Monsoon': preCount > 0 ? (preSum / preCount).toFixed(2) : null,
                'Post-Monsoon': pstCount > 0 ? (pstSum / pstCount).toFixed(2) : null
            };
        });
    }, [listData]);

    // Prepare Aquifer Distribution Data
    const aquiferDistribution = useMemo(() => {
        if (!listData || listData.length === 0) return [];

        const counts = {};
        listData.forEach(record => {
            const aq = record.aquifer || 'Unknown';
            counts[aq] = (counts[aq] || 0) + 1;
        });

        // Convert to array and sort
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [listData]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Render Selected Well View
    if (selectedWell) {
        // ... (Same as before)
        const chartData = (() => {
            const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
            return years.map(year => ({
                year: year.toString(),
                'Pre-Monsoon': selectedWell[`pre_${year}`],
                'Post-Monsoon': selectedWell[`pst_${year}`]
            }));
        })();

        return (
            <div className="well-inventory-section detailed-view">
                {/* 1. Well Profile Header */}
                <div className="well-profile-card">
                    <div className="profile-header">
                        <div className="profile-icon">💧</div>
                        <div className="profile-info">
                            <h4>{selectedWell.well_id}</h4>
                            <p>{selectedWell.village_name || selectedWell.village?.name || 'Unknown Village'}, {selectedWell.block || selectedWell.taluka || '-'}</p>
                        </div>
                    </div>

                    <div className="profile-stats-grid">
                        <div className="stat-item">
                            <label>Depth</label>
                            <strong>{selectedWell.well_depth ? `${selectedWell.well_depth} m` : 'N/A'}</strong>
                        </div>
                        <div className="stat-item">
                            <label>Aquifer</label>
                            <strong>{selectedWell.aquifer || 'N/A'}</strong>
                        </div>
                        <div className="stat-item">
                            <label>District</label>
                            <strong>{selectedWell.district || '-'}</strong>
                        </div>
                    </div>
                </div>

                {/* 2. Graph Section */}
                <div className="well-chart-container" style={{ height: isExpanded ? '400px' : '300px' }}>
                    <h5>Water Level History (2015-2024)</h5>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={5} />
                                <YAxis
                                    label={{ value: 'Depth (m bgl)', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: '#94a3b8' }, dx: 0 }}
                                    reversed={true}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                                    formatter={(value) => [`${value} m`, 'Depth']}
                                    labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                                <Line
                                    name="Pre-Monsoon"
                                    type="monotone"
                                    dataKey="Pre-Monsoon"
                                    stroke="#f59e0b"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                    connectNulls
                                />
                                <Line
                                    name="Post-Monsoon"
                                    type="monotone"
                                    dataKey="Post-Monsoon"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return <div className="well-inventory-loading">Loading specific area data...</div>;
    if (error) return <div className="well-inventory-error">{error}</div>;

    // Render Aggregated Dashboard (Default State)
    return (
        <div className="well-inventory-section dashboard-view">
            <div className="well-count-header">
                <h3>Regional Overview</h3>
                <span className="region-badge">{listData.length} Wells Analyzed</span>
            </div>

            {listData.length > 0 ? (
                <>
                    <div className="aggregated-chart-section">
                        <h5>Average Water Level Trends</h5>
                        <div className="chart-wrapper small-chart" style={{ height: isExpanded ? '300px' : '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={aggregatedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis
                                        reversed={true}
                                        tick={{ fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}
                                        formatter={(value) => [`${value} m`, 'Depth']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Line type="monotone" dataKey="Pre-Monsoon" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                                    <Line type="monotone" dataKey="Post-Monsoon" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="aquifer-stats-card">
                        <h5>Aquifer Distribution</h5>
                        <div className="pie-chart-wrapper">
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={aquiferDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                        innerRadius={40} // Creates the donut effect
                                        outerRadius={60}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {aquiferDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="aquifer-legend">
                                {aquiferDistribution.map((entry, index) => (
                                    <div key={index} className="legend-item">
                                        <span className="color-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                        <span>{entry.name}: {entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="well-inventory-empty" style={{ flexDirection: 'column', gap: '10px', padding: '40px 0' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📉</div>
                    <p style={{ margin: 0, color: '#94a3b8' }}>Data is not available. Please select another location.</p>
                </div>
            )}
        </div>
    );
};

export default WellInventorySection;
