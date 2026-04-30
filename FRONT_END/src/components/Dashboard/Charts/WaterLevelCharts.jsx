import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HydrographChart from '../../DataAnalysis/WellInventory/HydrographChart';
import api from '../../../api';
import * as Icons from 'lucide-react';

const WaterLevelCharts = ({ analysisResults, districtWaterLevelData, metricColor, filters = {} }) => {
    // Dynamic Correlation State
    // Dynamic Correlation State
    const [yParam, setYParam] = useState('ec');
    const [xMetric, setXMetric] = useState('water_level');
    const [correlationData, setCorrelationData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Hydrograph Selection State
    const [hydrographType, setHydrographType] = useState('average');

    const hydrographOptions = [
        { id: 'average', label: 'Average Water Level', color: '#1e3a8a' },
        { id: 'pre_monsoon', label: 'Pre Water Level', color: '#3b82f6' },
        { id: 'post_monsoon', label: 'Post Water Level', color: '#0ea5e9' }
    ];

    // Physical metrics that cannot be y_param in the backend
    const physicalMetrics = ['water_level', 'rainfall'];

    useEffect(() => {
        const fetchCorrelation = async () => {
            setIsLoading(true);
            try {
                // Normalise: backend requires y_param to be a WQ column.
                // If the user put a physical metric on the Y axis, swap axes
                // for the API call and flip the returned x/y when building points.
                const yIsPhysical = physicalMetrics.includes(yParam);
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
                    village: filters.village || undefined
                });

                if (res.results) {
                    // If axes were swapped for the API, flip them back so the
                    // chart always plots [xMetric, yParam] as [x, y].
                    const points = res.results.map(r =>
                        yIsPhysical ? [r.y, r.x] : [r.x, r.y]
                    );
                    setCorrelationData(points);
                }
            } catch (err) {
                console.error("Failed to fetch correlation:", err);
                setCorrelationData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCorrelation();
    }, [xMetric, yParam, filters]);

    const allParamLabels = {
        // Water Quality Parameters
        ec: 'EC (µS/cm)',
        ph: 'pH',
        tds: 'TDS (mg/l)',
        hardness: 'Hardness (mg/l)',
        alkalinity: 'Alkalinity (mg/l)',
        fluoride: 'Fluoride (mg/l)',
        nitrate: 'Nitrate (mg/l)',
        chloride: 'Chloride (mg/l)',
        sulphate: 'Sulphate (mg/l)',
        bicarbonate: 'Bicarbonate (mg/l)',
        carbonate: 'Carbonate (mg/l)',
        calcium: 'Calcium (mg/l)',
        magnesium: 'Magnesium (mg/l)',
        sodium: 'Sodium (mg/l)',
        potassium: 'Potassium (mg/l)',
        iron: 'Iron (mg/l)',
        arsenic: 'Arsenic (mg/l)',
        uranium: 'Uranium (µg/l)',
        // Physical Metrics
        water_level: 'Water Level (m.bgl)',
        rainfall: 'Annual Rainfall (mm)'
    };

    // Keep these for axis label lookups
    const yParamLabels = allParamLabels;
    const xMetricLabels = allParamLabels;

    // 3. Potability & Sustainability Insights
    const qualityInsight = React.useMemo(() => {
        const stats = analysisResults?.waterQualityStats?.summary;
        if (!stats) return null;
        const isSafe = (stats.avg_ec <= 3000) && (stats.avg_fluoride <= 1.5);
        return {
            safe: isSafe,
            color: isSafe ? '#10b981' : '#f59e0b',
            icon: isSafe ? 'CheckCircle2' : 'AlertTriangle',
            text: isSafe ? 'Generally Potable' : 'Quality Issues Detected',
            subtext: isSafe
                ? 'Primary parameters (EC/Fluoride) are within safe limits.'
                : 'Some samples exceed recommended safety thresholds.'
        };
    }, [analysisResults]);

    const trendInsight = React.useMemo(() => {
        const trends = analysisResults?.yearlyTrends?.yearly_trends || analysisResults?.yearlyTrends;
        if (!Array.isArray(trends) || trends.length < 2) return null;

        const first = trends[0].average || trends[0].value;
        const last = trends[trends.length - 1].average || trends[trends.length - 1].value;
        const diff = last - first;
        const degrading = diff > 0; // Increasing depth means declining levels

        return {
            degrading,
            color: degrading ? '#ef4444' : '#10b981',
            icon: degrading ? 'TrendingDown' : 'TrendingUp',
            text: degrading ? 'Declining Trend' : 'Recovering/Stable',
            subtext: `Net change of ${Math.abs(diff).toFixed(2)}m over the recorded period.`
        };
    }, [analysisResults]);

    return (
        <>
            {/* Top Charts Row */}
            <div className="chart-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Detailed Analysis</h3>
                    <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                        {hydrographOptions.map(opt => (
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
                                    transition: 'all 0.2s'
                                }}
                            >
                                {opt.label.replace(' Water Level', '')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="chart-container" style={{ height: '350px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%', overflow: 'hidden' }}>
                    <HydrographChart
                        dataKey={hydrographOptions.find(o => o.id === hydrographType).label}
                        data={
                            analysisResults?.yearlyTrends?.yearly_trends
                                ? analysisResults.yearlyTrends.yearly_trends.map(t => ({
                                    ...t,
                                    'Average Water Level': t.average !== undefined ? t.average : t['Average Water Level'],
                                    'Pre Water Level': t.pre_monsoon !== undefined ? t.pre_monsoon : t['Pre Water Level'],
                                    'Post Water Level': t.post_monsoon !== undefined ? t.post_monsoon : t['Post Water Level'],
                                    'Annual Rainfall': analysisResults.yearlyRainfallData && analysisResults.yearlyRainfallData[t.year] ? (analysisResults.yearlyRainfallData[t.year] / 1000) : null
                                }))
                                : Array.isArray(analysisResults?.yearlyTrends) ? analysisResults.yearlyTrends : []
                        }
                        height="340px"
                        showRainfall={true}
                    />
                </div>
            </div>

            <div className="chart-item">
                <h3>District-wise Water Level</h3>
                <div style={{ height: '400px', width: '100%' }}>
                    {districtWaterLevelData?.length > 0 ? (
                        <div className="chart-container" style={{ height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={{
                                    chart: { type: 'column', backgroundColor: 'transparent', height: 400 },
                                    title: { text: 'District-wise Average Water Level' },
                                    xAxis: {
                                        categories: districtWaterLevelData.map(d => d.name),
                                        title: { text: 'Districts' },
                                        labels: { rotation: -45, style: { fontSize: '9px' } }
                                    },
                                    yAxis: {
                                        title: { text: 'Water Level (m.bgl)' },
                                        reversed: false
                                    },
                                    series: [{
                                        name: 'Avg Static WL',
                                        data: districtWaterLevelData.map(d => d.value),
                                        color: metricColor || '#3b82f6',
                                        borderRadius: 4
                                    }],
                                    credits: { enabled: false },
                                    tooltip: { valueSuffix: ' m.bgl' }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                            <p>No district data available.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Middle Section: Correlation Analysis */}
            <div className="chart-item full-width">
                <div className="chart-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Parameter Correlation Analysis</h3>
                    <div className="selectors" style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={yParam}
                            onChange={(e) => setYParam(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        >
                            {Object.entries(allParamLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                        <span style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>vs</span>
                        <select
                            value={xMetric}
                            onChange={(e) => setXMetric(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        >
                            {Object.entries(allParamLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                    {isLoading && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.Loader2 className="animate-spin" size={32} color={metricColor} />
                        </div>
                    )}

                    {correlationData?.length > 0 ? (
                        <div className="chart-container" style={{ height: '400px', background: 'white', padding: '10px', borderRadius: '12px', width: '100%' }}>
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={{
                                    chart: { type: 'scatter', zoomType: 'xy', backgroundColor: 'transparent', height: 400 },
                                    title: { text: null },
                                    xAxis: {
                                        title: { enabled: true, text: xMetricLabels[xMetric] },
                                        startOnTick: true,
                                        endOnTick: true,
                                        showLastLabel: true
                                    },
                                    yAxis: {
                                        title: { text: yParamLabels[yParam] }
                                    },
                                    plotOptions: {
                                        scatter: {
                                            marker: { radius: 5, states: { hover: { enabled: true, lineColor: 'rgb(100,100,100)' } } },
                                            tooltip: {
                                                headerFormat: '<b>Spatial Correlation</b><br>',
                                                pointFormat: `${xMetricLabels[xMetric]}: {point.x}<br/>${yParamLabels[yParam]}: {point.y}`
                                            }
                                        }
                                    },
                                    series: [{
                                        name: 'Matched Stations',
                                        color: metricColor || '#3b82f6',
                                        data: correlationData
                                    }],
                                    credits: { enabled: false }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="chart-empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                            <p>{isLoading ? 'Comparing points spatially...' : 'No correlation data found for this pair.'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Sustainability Insights */}
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
