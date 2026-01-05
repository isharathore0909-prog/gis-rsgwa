import React from 'react';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';

const GroundWaterSection = ({
    isGWRE,
    pieData,
    totalBlocks,
    waterLevelChartData,
    aquiferData,
    qualityData,
    blockWaterQualityData,
    getParameterColor
}) => {
    return (
        <div className="groundwater-analysis-grid animated-entry">
            <AnalysisCard title={isGWRE ? 'Stage of Ground Water Extraction' : 'Ground Water Status'}>
                <div className="pie-chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="status-summary-grid">
                    {isGWRE && (
                        <MiniStatusCard value={totalBlocks} label="Total Blocks" color="#3b82f6" style={{ gridColumn: '1 / -1' }} />
                    )}
                    {pieData.map((d, i) => (
                        <MiniStatusCard key={i} value={d.value} label={d.name} color={d.color} />
                    ))}
                </div>
            </AnalysisCard>

            <AnalysisCard title="Ground Water Level (mbgl)">
                <div className="bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={waterLevelChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} reversed />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" radius={[0, 0, 4, 4]}>
                                {waterLevelChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </AnalysisCard>

            <AnalysisCard title="Aquifers Present">
                <div className="bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={aquiferData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" fill="#8884d8" name="Area (sq km)" radius={[0, 4, 4, 0]}>
                                {aquiferData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="aquifer-details-list">
                    {aquiferData.map((d, i) => (
                        <div key={i} className="aquifer-detail-item">
                            <div className="detail-header">
                                <span className="dot" style={{ backgroundColor: d.color }}></span>
                                <span className="name">{d.name}</span>
                            </div>
                            <div className="detail-stats">
                                <span className="area">{d.area} <small>sq km</small></span>
                                <span className="percent">{d.percent}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </AnalysisCard>

            <AnalysisCard title="Water Quality Compliance">
                <div className="bar-chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={qualityData}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis
                                dataKey="subject"
                                type="category"
                                width={70}
                                tick={{ fontSize: 11, fontWeight: 500 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="custom-chart-tooltip">
                                                <p className="tooltip-title">{data.subject}</p>
                                                <p className="tooltip-item"><strong>Limit:</strong> {data.label}</p>
                                                <p className="tooltip-item"><strong>Exceedance:</strong> {data.value}% Stations</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="value" fill="#f4a261" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="quality-legend-simple">
                    <div className="legend-label">% Stations Exceeding Permissible Limits</div>
                </div>
            </AnalysisCard>

            {blockWaterQualityData && !Array.isArray(blockWaterQualityData) && (
                <AnalysisCard title={`Block Water Quality: ${blockWaterQualityData.block}`} className="full-width">
                    <div className="status-summary-grid" style={{ marginBottom: '1rem' }}>
                        {blockWaterQualityData.wqi && (
                            <MiniStatusCard
                                value={blockWaterQualityData.wqi.value}
                                label={`WQI - ${blockWaterQualityData.wqi.classification}`}
                                color={blockWaterQualityData.wqi.value < 100 ? '#2a9d8f' : blockWaterQualityData.wqi.value < 200 ? '#f4a261' : '#e63946'}
                                style={{ gridColumn: '1 / -1' }}
                            />
                        )}
                        {blockWaterQualityData.status && (
                            <MiniStatusCard
                                value={blockWaterQualityData.status.text}
                                label={blockWaterQualityData.status.issues.length > 0
                                    ? blockWaterQualityData.status.issues.join(', ')
                                    : 'All parameters within safe limits'}
                                color={blockWaterQualityData.status.status === 'good' ? '#2a9d8f' : blockWaterQualityData.status.status === 'warning' ? '#f4a261' : '#e63946'}
                                style={{ gridColumn: '1 / -1' }}
                            />
                        )}
                    </div>

                    <div className="aquifer-details-list">
                        {[
                            { id: 'ec', name: 'Electrical Conductivity (EC)', unit: 'µS/cm', threshold: 3000 },
                            { id: 'fluoride', name: 'Fluoride', unit: 'mg/l', threshold: 1.5 },
                            { id: 'nitrate', name: 'Nitrate', unit: 'mg/l', threshold: 45 },
                            { id: 'iron', name: 'Iron', unit: 'mg/l', threshold: 1.0 },
                            { id: 'arsenic', name: 'Arsenic', unit: 'µg/l', threshold: 10 },
                            { id: 'uranium', name: 'Uranium', unit: 'µg/l', threshold: 30 },
                            { id: 'tds', name: 'Total Dissolved Solids (TDS)', unit: 'mg/l', threshold: 2000 },
                            { id: 'ph', name: 'pH', unit: '', range: [6.5, 8.5] },
                            { id: 'chloride', name: 'Chloride', unit: 'mg/l', threshold: 1000 },
                            { id: 'hardness', name: 'Total Hardness', unit: 'mg/l', threshold: 600 }
                        ].map(param => {
                            const val = blockWaterQualityData[param.id];
                            if (val === undefined) return null;

                            let isHigh = false;
                            if (param.threshold) isHigh = val > param.threshold;
                            else if (param.range) isHigh = val < param.range[0] || val > param.range[1];

                            return (
                                <div key={param.id} className="aquifer-detail-item">
                                    <div className="detail-header">
                                        <span className="dot" style={{ backgroundColor: getParameterColor(param.id, val) }}></span>
                                        <span className="name">{param.name}</span>
                                    </div>
                                    <div className="detail-stats">
                                        <span className="area">{val} <small>{param.unit}</small></span>
                                        <span className="percent" style={{ fontSize: '0.7rem', color: isHigh ? '#e63946' : '#2a9d8f' }}>
                                            {isHigh ? (param.id === 'ph' ? 'Out of Range' : 'High') : (param.id === 'ph' ? 'Normal' : 'Safe')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </AnalysisCard>
            )}
        </div>
    );
};

export default GroundWaterSection;
