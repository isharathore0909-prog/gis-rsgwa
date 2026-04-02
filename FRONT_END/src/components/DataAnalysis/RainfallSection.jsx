import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ComposedChart, Line, LabelList
} from 'recharts';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';
import SmartChartContainer from './Common/SmartChartContainer';
import GlassLoadingOverlay from '../Common/GlassLoadingOverlay';
import { calculateLinearTrendLine } from '../../utils/statsUtils';
import './RainfallSection.css';

const RainfallSection = ({
    displayRegion,
    analysisLevel,
    rainfallStats,
    rainfallPoints = [],
    viewType: propViewType = 'monthly',
    isExpanded,
    isLoading
}) => {
    const viewType = propViewType.toLowerCase();

    const aggregatedData = useMemo(() => {
        if (!rainfallPoints || !Array.isArray(rainfallPoints) || rainfallPoints.length === 0) return [];

        const isPreAggregated = rainfallPoints[0].name && (rainfallPoints[0].total !== undefined || rainfallPoints[0].average !== undefined || rainfallPoints[0].monsoon !== undefined) && !rainfallPoints[0].date && !rainfallPoints[0].rainfall_mm;
        if (isPreAggregated) {
            if (viewType === 'seasonal') {
                const results = rainfallPoints.map(d => ({
                    ...d,
                    monsoon: d.monsoon || 0,
                    non_monsoon: d.non_monsoon || 0,
                    average: d.average || (d.monsoon || 0) + (d.non_monsoon || 0)
                }));
                const mT = calculateLinearTrendLine(results, 'monsoon');
                const nmT = calculateLinearTrendLine(results, 'non_monsoon');
                return results.map((d, i) => ({
                    ...d,
                    monsoonTrend: mT ? mT[i] : null,
                    nonMonsoonTrend: nmT ? nmT[i] : null
                }));
            }
            const trend = calculateLinearTrendLine(rainfallPoints, 'average');
            return rainfallPoints.map((d, i) => ({ ...d, trend: trend ? trend[i] : null }));
        }

        const getUniqueId = (item) => item.station || item.station_id || item.village || item.id || JSON.stringify(item.properties);

        const parseDate = (d) => {
            if (!d) return null;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        const grouped = rainfallPoints.reduce((acc, curr) => {
            // Support both backend 'ts' and frontend 'date'/'rainfall_date'
            const rawDate = curr.ts || curr.date || curr.rainfall_date;
            const date = parseDate(rawDate);
            if (!date) return acc;

            let key;
            if (viewType === 'daily') key = rawDate.toString().split('T')[0];
            else if (viewType === 'monthly') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            else if (viewType === 'yearly' || viewType === 'seasonal') key = `${date.getFullYear()}`;
            else return acc;

            if (!acc[key]) acc[key] = { name: key, total: 0, monsoonTotal: 0, nonMonsoonTotal: 0, count: 0, uniqueIds: new Set() };

            // Support both backend 'rainfall' and frontend 'rainfall_mm'
            const val = (curr.rainfall ?? curr.rainfall_mm ?? curr.rainfall_in_mm ?? 0);
            acc[key].total += val;
            acc[key].count += 1;

            const month = date.getMonth() + 1; // 1-indexed
            if ([6, 7, 8, 9].includes(month)) {
                acc[key].monsoonTotal += val;
            } else {
                acc[key].nonMonsoonTotal += val;
            }

            const id = getUniqueId(curr);
            if (id) acc[key].uniqueIds.add(id);
            return acc;
        }, {});

        const results = Object.values(grouped)
            .map(d => {
                const divisor = d.uniqueIds.size > 0 ? d.uniqueIds.size : (d.count || 1);
                return {
                    ...d,
                    average: parseFloat((d.total / divisor).toFixed(2)),
                    monsoon: parseFloat((d.monsoonTotal / divisor).toFixed(2)),
                    non_monsoon: parseFloat((d.nonMonsoonTotal / divisor).toFixed(2))
                };
            })
            .sort((a, b) => {
                if (viewType === 'daily') return new Date(a.name) - new Date(b.name);
                return a.name.localeCompare(b.name);
            });

        if (viewType === 'seasonal') {
            const mT = calculateLinearTrendLine(results, 'monsoon');
            const nmT = calculateLinearTrendLine(results, 'non_monsoon');
            return results.map((d, i) => ({
                ...d,
                monsoonTrend: mT ? mT[i] : null,
                nonMonsoonTrend: nmT ? nmT[i] : null
            }));
        }

        const trend = calculateLinearTrendLine(results, 'average');
        return results.map((d, i) => ({
            ...d,
            trend: trend ? trend[i] : null
        }));
    }, [rainfallPoints, viewType]);

    const computedAverage = useMemo(() => {
        if (!aggregatedData || aggregatedData.length === 0) return 0;
        const sum = aggregatedData.reduce((acc, item) => {
            let val = 0;
            if (item.average !== undefined && item.average !== null) {
                val = item.average;
            } else if (item.monsoon !== undefined && item.monsoon !== null) {
                val = (item.monsoon || 0) + (item.non_monsoon || 0);
            }
            return acc + (val || 0);
        }, 0);
        return sum / aggregatedData.length;
    }, [aggregatedData]);

    const title = useMemo(() => {
        if (rainfallStats?.isNearbyData) return `Rainfall Overview: Nearby Data (${rainfallStats.radius_km}km radius)`;

        let label = (analysisLevel === 'State' || !displayRegion) ? 'Statewide' : displayRegion;
        if (rainfallStats?.isFallback && rainfallStats?.stationNames?.length > 0) {
            label = `${label} (Station: ${rainfallStats.stationNames[0]})`;
        }
        return `Rainfall Overview: ${label}`;
    }, [rainfallStats, analysisLevel, displayRegion]);

    if (isLoading) {
        return (
            <div className="rainfall-grid animated-entry" style={{ position: 'relative', minHeight: '300px' }}>
                <GlassLoadingOverlay
                    message="Analyzing Rainfall Patterns"
                    subtext={`Fetching records for ${displayRegion || 'Rajasthan'}`}
                />
            </div>
        );
    }

    const hasNoData = !rainfallStats || rainfallStats?.isEmpty || (rainfallStats && !rainfallStats.count && !rainfallStats.average && !rainfallStats.total);
    if (hasNoData) {
        return (
            <div className="rainfall-grid animated-entry">
                <AnalysisCard className="full-width-card centered-loading">
                    <span style={{ fontSize: '2rem' }}>📊</span>
                    <h3>No Rainfall Data Found</h3>
                    <p>We couldn't find any historical rainfall records for <strong>{displayRegion || 'this selection'}</strong>. Try a different region or time range.</p>
                </AnalysisCard>
            </div>
        );
    }

    return (
        <div className="rainfall-grid animated-entry">
            <AnalysisCard title={title}>
                <div className="status-summary-grid">
                    <MiniStatusCard
                        value={`${computedAverage.toFixed(2)} mm`}
                        label="Average Rainfall"
                        color="#2a9d8f"
                    />
                    <MiniStatusCard value={`${Number(rainfallStats?.monsoon_avg ?? 0).toFixed(2)} mm`} label="Monsoon Avg" color="#3b82f6" />
                    <MiniStatusCard value={`${Number(rainfallStats?.non_monsoon_avg ?? 0).toFixed(2)} mm`} label="Non-Monsoon Avg" color="#f4a261" />
                    <MiniStatusCard value={`${rainfallStats?.count ?? 0}`} label="Total Records" color="#6366f1" />
                </div>
                <div className="status-summary-grid" style={{ marginTop: '0.5rem' }}>
                    <MiniStatusCard value={`${Number(rainfallStats?.avg ?? 0).toFixed(2)} mm`} label="Avg Reading" color="#457b9d" />
                    <MiniStatusCard value={`${Number(rainfallStats?.max ?? 0).toFixed(2)} mm`} label="Highest Record" color="#94a3b8" />
                </div>
            </AnalysisCard>
            <AnalysisCard title={
                viewType === 'seasonal'
                    ? 'Monsoon vs Non-Monsoon Trend (mm)'
                    : `${viewType === 'yearly' ? 'Annual' : viewType.toUpperCase()} Rainfall Trend (mm)`
            }>
                <SmartChartContainer height={isExpanded ? '320px' : '240px'} className="bar-chart-wrapper">
                    <ComposedChart data={aggregatedData} margin={{ top: 20, right: 35, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9 }}
                            tickFormatter={(val) => {
                                if (viewType === 'daily') return val.split('-').slice(1).join('/');
                                return val;
                            }}
                        />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} />
                        <Tooltip
                            allowEscapeViewBox={{ y: true }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value) => [`${value.toFixed(1)} mm`, 'Rainfall']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        {viewType === 'seasonal' ? (
                            <>
                                <Bar
                                    dataKey="monsoon"
                                    name="Monsoon (Jun-Sep)"
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                    isAnimationActive={false}
                                >
                                    <LabelList dataKey="monsoon" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} formatter={(val) => Math.round(val)} />
                                </Bar>
                                <Bar
                                    dataKey="non_monsoon"
                                    name="Non-Monsoon"
                                    fill="#f4a261"
                                    radius={[4, 4, 0, 0]}
                                    isAnimationActive={false}
                                >
                                    <LabelList dataKey="non_monsoon" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} formatter={(val) => Math.round(val)} />
                                </Bar>
                                <Line type="monotone" dataKey="monsoonTrend" name="Monsoon Trend" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                                <Line type="monotone" dataKey="nonMonsoonTrend" name="Non-Monsoon Trend" stroke="#e67e22" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                            </>
                        ) : (
                            <>
                                <Bar
                                    dataKey="average"
                                    name={viewType === 'yearly' ? 'Annual Rainfall' : 'Avg Rain (mm)'}
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                    isAnimationActive={false}
                                >
                                    {viewType === 'yearly' && (
                                        <LabelList dataKey="average" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} formatter={(val) => Math.round(val)} />
                                    )}
                                </Bar>
                                <Line type="monotone" dataKey="trend" name="Linear Trend" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                            </>
                        )}
                    </ComposedChart>
                </SmartChartContainer>
            </AnalysisCard>

            <AnalysisCard title="Highest Recorded Sample">
                {rainfallStats.maxVillage ? (
                    <div className="max-record-content">
                        <div className="max-record-hero">
                            <div className="max-record-value">
                                <span className="max-value">{Number(rainfallStats?.max ?? 0).toFixed(1)}</span>
                                <span className="max-unit">mm</span>
                            </div>
                            <span className="max-label">Maximum Recorded</span>
                        </div>

                        <div className="max-details">
                            <div className="detail-row">
                                <span className="detail-label">
                                    <span className="indicator" style={{ backgroundColor: '#f43f5e' }}></span>
                                    Location
                                </span>
                                <span className="detail-value">{rainfallStats.maxVillage}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">
                                    <span className="indicator" style={{ backgroundColor: '#6366f1' }}></span>
                                    Date
                                </span>
                                <span className="detail-value">{rainfallStats.maxDate}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="no-record-msg">No record available for this selection</div>
                )}
            </AnalysisCard>
        </div >
    );
};

export default React.memo(RainfallSection);
