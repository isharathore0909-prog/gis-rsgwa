import React, { useMemo } from 'react';
import AnalysisCard from './Common/AnalysisCard';
import RainfallCharts from './Rainfall/RainfallCharts';
import RainfallStatsGrid from './Rainfall/RainfallStatsGrid';
import RainfallExtremeRecord from './Rainfall/RainfallExtremeRecord';
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

    const hasNoData = !rainfallStats || rainfallStats?.isEmpty || (rainfallStats && !rainfallStats.count && !rainfallStats.avg && !rainfallStats.total);
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
                <RainfallStatsGrid rainfallStats={rainfallStats} computedAverage={computedAverage} />
            </AnalysisCard>

            <AnalysisCard title={
                viewType === 'seasonal'
                    ? 'Monsoon vs Non-Monsoon Trend (mm)'
                    : `${viewType === 'yearly' ? 'Annual' : viewType.toUpperCase()} Rainfall Trend (mm)`
            }>
                <RainfallCharts aggregatedData={aggregatedData} viewType={viewType} isExpanded={isExpanded} />
            </AnalysisCard>

            <AnalysisCard title="Highest Recorded Sample">
                <RainfallExtremeRecord rainfallStats={rainfallStats} />
            </AnalysisCard>
        </div >
    );
};

export default React.memo(RainfallSection);
