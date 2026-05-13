import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HydrographChart from '../../DataAnalysis/WellInventory/HydrographChart';
import api from '../../../api';
import * as Icons from 'lucide-react';
import ChartLoader from '../../Common/ChartLoader';
import ParamSelect from './ParamSelect';
import {
    PHYSICAL_METRICS,
    HYDROGRAPH_OPTIONS,
    PARAM_LABELS,
    WQ_PARAM_ENTRIES,
    STYLES,
} from './waterLevelConstants';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const WaterLevelCharts = ({
    analysisResults,
    districtWaterLevelData,
    metricColor,
    filters = {},
    isLoading: isDataLoading,
}) => {
    const [yParam, setYParam] = useState('ec');
    const [xMetric, setXMetric] = useState('water_level');
    const [correlationData, setCorrelationData] = useState([]);
    const [backendRegression, setBackendRegression] = useState(null);
    const [isCorrelationLoading, setIsCorrelationLoading] = useState(false);
    const [showTrendLine, setShowTrendLine] = useState(true);
    const [hydrographType, setHydrographType] = useState('average');

    // ------------------------------------------------------------------
    // Data fetching – correlation
    // ------------------------------------------------------------------
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchCorrelation = async () => {
            setIsCorrelationLoading(true);
            try {
                // Normalise: backend requires y_param to be a WQ column.
                // If the user put a physical metric on the Y axis, swap axes
                // for the API call and flip the returned x/y when building points.
                const yIsPhysical = PHYSICAL_METRICS.includes(yParam);
                const apiYParam = yIsPhysical ? xMetric : yParam;
                const apiXMetric = yIsPhysical ? yParam : xMetric;

                const res = await api.waterQuality.getCorrelation({
                    x_metric: apiXMetric,
                    y_param: apiYParam,
                    year: '2024',
                    radius_km: 20,
                    limit: 100,
                    district: filters.district || undefined,
                    block: filters.block || filters.taluka || undefined,
                    gp: filters.gramPanchayat || undefined,
                    village: filters.village || undefined,
                }, signal);

                if (!signal.aborted && res.results) {
                    const points = res.results.map(r =>
                        yIsPhysical ? [r.y, r.x] : [r.x, r.y]
                    );
                    setCorrelationData(points);
                    setBackendRegression(res.regression);
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') return;
                console.error('Failed to fetch correlation:', err);
                if (!signal.aborted) setCorrelationData([]);
            } finally {
                if (!signal.aborted) setIsCorrelationLoading(false);
            }
        };

        fetchCorrelation();
        return () => controller.abort();
    }, [xMetric, yParam, filters]);

    // ------------------------------------------------------------------
    // Derived data – memoized
    // ------------------------------------------------------------------

    // Regression calculation moved to backend

    const qualityInsight = useMemo(() => {
        const stats = analysisResults?.waterQualityStats?.summary;
        if (!stats) return null;
        const isSafe = stats.avg_ec <= 3000 && stats.avg_fluoride <= 1.5;
        return {
            safe: isSafe,
            color: isSafe ? '#10b981' : '#f59e0b',
            icon: isSafe ? 'CheckCircle2' : 'AlertTriangle',
            text: isSafe ? 'Generally Potable' : 'Quality Issues Detected',
            subtext: isSafe
                ? 'Primary parameters (EC/Fluoride) are within safe limits.'
                : 'Some samples exceed recommended safety thresholds.',
        };
    }, [analysisResults]);

    const trendInsight = useMemo(() => {
        const trends = analysisResults?.yearlyTrends?.yearly_trends ?? analysisResults?.yearlyTrends;
        if (!Array.isArray(trends) || trends.length < 2) return null;

        const first = trends[0].average ?? trends[0].value;
        const last = trends[trends.length - 1].average ?? trends[trends.length - 1].value;
        const diff = last - first;
        const degrading = diff > 0; // Increasing depth means declining levels

        return {
            degrading,
            color: degrading ? '#ef4444' : '#10b981',
            icon: degrading ? 'TrendingDown' : 'TrendingUp',
            text: degrading ? 'Declining Trend' : 'Recovering/Stable',
            subtext: `Net change of ${Math.abs(diff).toFixed(2)}m over the recorded period.`,
        };
    }, [analysisResults]);

    /** Memoized hydrograph data transform to avoid re-mapping on every render */
    const hydrographData = useMemo(() => {
        if (analysisResults?.yearlyTrends?.yearly_trends) {
            return analysisResults.yearlyTrends.yearly_trends.map(t => ({
                ...t,
                'Average Water Level': t.average ?? t['Average Water Level'],
                'Pre Water Level': t.pre_monsoon ?? t['Pre Water Level'],
                'Post Water Level': t.post_monsoon ?? t['Post Water Level'],
                'Annual Rainfall': analysisResults.yearlyRainfallData?.[t.year]
                    ? analysisResults.yearlyRainfallData[t.year] / 1000
                    : null,
            }));
        }
        return Array.isArray(analysisResults?.yearlyTrends) ? analysisResults.yearlyTrends : [];
    }, [analysisResults]);

    const activeHydrograph = useMemo(
        () => HYDROGRAPH_OPTIONS.find(o => o.id === hydrographType),
        [hydrographType]
    );

    /** Memoized Highcharts options for the district column chart */
    const districtChartOptions = useMemo(() => ({
        chart: { type: 'column', backgroundColor: 'transparent', height: 400 },
        title: { text: 'District-wise Average Water Level' },
        xAxis: {
            categories: districtWaterLevelData?.map(d => d.name) ?? [],
            title: { text: 'Districts' },
            labels: { rotation: -45, style: { fontSize: '9px' } },
        },
        yAxis: { title: { text: 'Water Level (m.bgl)' }, reversed: false },
        series: [{
            name: 'Avg Static WL',
            data: districtWaterLevelData?.map(d => d.value) ?? [],
            color: metricColor || '#3b82f6',
            borderRadius: 4,
        }],
        credits: { enabled: false },
        tooltip: { valueSuffix: ' m.bgl' },
    }), [districtWaterLevelData, metricColor]);

    /** Memoized Highcharts options for the scatter / correlation chart */
    const correlationChartOptions = useMemo(() => ({
        chart: { type: 'scatter', zoomType: 'xy', backgroundColor: 'transparent', height: 400 },
        title: { text: null },
        xAxis: {
            title: { enabled: true, text: PARAM_LABELS[xMetric] },
            startOnTick: true,
            endOnTick: true,
            showLastLabel: true,
        },
        yAxis: { title: { text: PARAM_LABELS[yParam] } },
        plotOptions: {
            scatter: {
                marker: { radius: 5, states: { hover: { enabled: true, lineColor: 'rgb(100,100,100)' } } },
                tooltip: {
                    headerFormat: '<b>Spatial Correlation</b><br>',
                    pointFormat: `${PARAM_LABELS[xMetric]}: {point.x}<br/>${PARAM_LABELS[yParam]}: {point.y}`,
                },
            },
        },
        series: [
            {
                name: 'Matched Stations',
                type: 'scatter',
                color: metricColor || '#3b82f6',
                data: correlationData,
                marker: { radius: 4 },
                zIndex: 1,
            },
            ...(showTrendLine && backendRegression ? [{
                name: `Trend Line (R²: ${backendRegression.r_squared})`,
                type: 'line',
                data: backendRegression.line_points,
                color: '#ef4444',
                dashStyle: 'Dash',
                lineWidth: 2,
                marker: { enabled: false },
                states: { hover: { lineWidth: 3 } },
                enableMouseTracking: true,
                tooltip: { pointFormat: `Correlation Trend Line<br/>R²: ${backendRegression.r_squared}` },
                zIndex: 2,
            }] : []),
        ],
        credits: { enabled: false },
    }), [xMetric, yParam, correlationData, metricColor, showTrendLine, backendRegression]);

    // Stable callback – avoids inline arrow on every render
    const handleTrendToggle = useCallback(() => setShowTrendLine(prev => !prev), []);
    const handleTrendCheckbox = useCallback(e => { e.stopPropagation(); setShowTrendLine(e.target.checked); }, []);
    const stopPropagation = useCallback(e => e.stopPropagation(), []);

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <>
            {/* Detailed / Hydrograph Chart */}
            <div className="chart-item">
                <div style={STYLES.chartHeader}>
                    <h3>Detailed Analysis</h3>
                    <div style={STYLES.tabBar}>
                        {HYDROGRAPH_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setHydrographType(opt.id)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: hydrographType === opt.id ? 'white' : 'transparent',
                                    color: hydrographType === opt.id ? opt.color : '#64748b',
                                    fontWeight: hydrographType === opt.id ? 700 : 500,
                                    boxShadow: hydrographType === opt.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {opt.label.replace(' Water Level', '')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%', overflow: 'hidden' }}>
                    <HydrographChart
                        dataKey={activeHydrograph.label}
                        data={hydrographData}
                        height="340px"
                        showRainfall={true}
                        isLoading={isDataLoading}
                    />
                </div>
            </div>

            {/* District-wise Water Level */}
            <div className="chart-item">
                <h3>District-wise Water Level</h3>
                <div style={{ height: '400px', width: '100%' }}>
                    {districtWaterLevelData?.length > 0 ? (
                        <div className="chart-container" style={STYLES.chartContainer}>
                            <ChartLoader isLoading={isDataLoading} minHeight="380px">
                                <HighchartsReact highcharts={Highcharts} options={districtChartOptions} />
                            </ChartLoader>
                        </div>
                    ) : (
                        <div className="chart-empty-state" style={STYLES.emptyState}>
                            <p>No district data available.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Correlation Analysis */}
            <div className="chart-item full-width">
                <div className="chart-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>Parameter Correlation Analysis</h3>
                    <div className="selectors" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', alignItems: 'center' }}>
                        <ParamSelect value={yParam} onChange={e => setYParam(e.target.value)} />
                        <span style={STYLES.vsLabel}>vs</span>
                        <ParamSelect value={xMetric} onChange={e => setXMetric(e.target.value)} />

                        <div style={STYLES.divider} />

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: showTrendLine ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                            }}
                            onClick={handleTrendToggle}
                        >
                            <input
                                type="checkbox"
                                id="trendline-toggle"
                                checked={showTrendLine}
                                onChange={handleTrendCheckbox}
                                style={{ cursor: 'pointer', accentColor: '#ef4444' }}
                            />
                            <label
                                htmlFor="trendline-toggle"
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: showTrendLine ? '#ef4444' : '#64748b',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                                onClick={stopPropagation}
                            >
                                Trend Line
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                    <ChartLoader isLoading={isCorrelationLoading} minHeight="400px">
                        {correlationData?.length > 0 ? (
                            <div className="chart-container" style={{ height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                                <HighchartsReact highcharts={Highcharts} options={correlationChartOptions} />
                            </div>
                        ) : (
                            <div className="chart-empty-state" style={STYLES.emptyState}>
                                <p>{isCorrelationLoading ? 'Comparing points spatially...' : 'No correlation data found for this pair.'}</p>
                            </div>
                        )}
                    </ChartLoader>
                </div>
            </div>

            {/* Sustainability Insights */}
            {(qualityInsight || trendInsight) && (
                <div className="chart-item full-width" style={{ gridColumn: 'span 3', display: 'flex', gap: '16px', background: 'transparent', padding: '0 0 20px 0', marginTop: '10px' }}>
                    {qualityInsight && (
                        <div className="insight-card" style={{ flex: 1, background: 'white', padding: '16px', borderRadius: '12px', border: `1px solid ${qualityInsight.color}33`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ color: qualityInsight.color, padding: '12px', background: `${qualityInsight.color}11`, borderRadius: '12px' }}>
                                {React.createElement(Icons[qualityInsight.icon], { size: 28 })}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quality Insight</h4>
                                <p style={{ margin: '2px 0 0 0', fontSize: '18px', color: qualityInsight.color, fontWeight: 700 }}>{qualityInsight.text}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{qualityInsight.subtext}</p>
                            </div>
                        </div>
                    )}
                    {trendInsight && (
                        <div className="insight-card" style={{ flex: 1, background: 'white', padding: '16px', borderRadius: '12px', border: `1px solid ${trendInsight.color}33`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ color: trendInsight.color, padding: '12px', background: `${trendInsight.color}11`, borderRadius: '12px' }}>
                                {React.createElement(Icons[trendInsight.icon], { size: 28 })}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sustainability Insight</h4>
                                <p style={{ margin: '2px 0 0 0', fontSize: '18px', color: trendInsight.color, fontWeight: 700 }}>{trendInsight.text}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{trendInsight.subtext}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default WaterLevelCharts;
