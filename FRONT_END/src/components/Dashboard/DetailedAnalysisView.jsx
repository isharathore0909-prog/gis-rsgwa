import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import * as Icons from 'lucide-react';
const ParallelCoordinatesPlot = lazy(() => import('./Charts/ParallelCoordinatesPlot'));
const WaterLevelAnalysisView = lazy(() => import('./Charts/WaterLevelAnalysisView'));
import Spinner from '../Common/ChartSpinner';
import api from '../../api';

const DetailedAnalysisView = ({ metricId, filters, metricColor }) => {
    const [selectedMetrics, setSelectedMetrics] = useState([]);
    const [plotData, setPlotData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableMetrics = {
        ph: 'pH',
        tds: 'TDS (mg/l)',
        ec: 'EC (µS/cm)',
        hardness: 'Hardness (mg/l)',
        nitrate: 'Nitrate (mg/l)',
        fluoride: 'Fluoride (mg/l)',
        alkalinity: 'Alkalinity (mg/l)',
        chloride: 'Chloride (mg/l)',
        sulphate: 'Sulphate (mg/l)',
        sodium: 'Sodium (mg/l)',
        potassium: 'Potassium (mg/l)',
        calcium: 'Calcium (mg/l)',
        magnesium: 'Magnesium (mg/l)'
    };

    useEffect(() => {
        // Initial defaults for parallel plot
        setSelectedMetrics(['ph', 'tds', 'ec', 'hardness', 'fluoride']);
    }, []);

    useEffect(() => {
        if (selectedMetrics.length < 2) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch the points for the parallel plot
                const res = await api.waterQuality.getCorrelationMatrix({
                    'metrics[]': selectedMetrics,
                    district: filters.district || undefined,
                    block: filters.block || undefined,
                    include_points: 'true',
                    limit: 1000 // up to 1000 points
                }, signal);
                setPlotData(res);
            } catch (err) {
                if (err.name !== 'AbortError' && err.message !== 'canceled') {
                    console.error("Failed to fetch parallel plot data:", err);
                }
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        const timer = setTimeout(fetchData, 400);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [selectedMetrics, filters]);

    const toggleMetric = (m) => {
        if (selectedMetrics.includes(m)) {
            if (selectedMetrics.length > 2) {
                setSelectedMetrics(prev => prev.filter(item => item !== m));
            }
        } else {
            if (selectedMetrics.length < 8) {
                setSelectedMetrics(prev => [...prev, m]);
            }
        }
    };

    const [showInfo, setShowInfo] = useState(false);

    // Calculate dynamic insights based on correlation matrix and points
    const insights = useMemo(() => {
        if (!plotData || !plotData.data_points || selectedMetrics.length < 2) return [];

        const generatedInsights = [];

        // 1. Fully Dynamic Anomaly Detection (Outliers)
        const anomalies = [];
        selectedMetrics.forEach(m => {
            const vals = plotData.data_points.map(p => p[m]).filter(v => v !== null && v !== undefined);
            if (vals.length > 5) {
                const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                const max = Math.max(...vals);

                // Flag as severe outlier if max is unusually massive compared to the average
                if (max > mean * 3 && mean > 0) {
                    anomalies.push(m);
                }
            }
        });

        if (anomalies.length > 0) {
            const names = anomalies.map(a => availableMetrics[a]).join(' and ');
            generatedInsights.push({
                text: `Extreme, isolated concentration spikes detected in ${names}. In the plot above, look for the single threads that break violently upward away from the main clustered baseline for these parameters. Hovering over these specific outlier paths will identify the exact locations requiring immediate localized investigation.`
            });
        }

        // 2. Statistical Extrapolations (Correlations)
        if (plotData.matrix) {
            let maxCorr = { val: 0, m1: null, m2: null };
            let minCorr = { val: 1, m1: null, m2: null };

            for (let i = 0; i < selectedMetrics.length; i++) {
                for (let j = i + 1; j < selectedMetrics.length; j++) {
                    const m1 = selectedMetrics[i];
                    const m2 = selectedMetrics[j];
                    const r = plotData.matrix[m1]?.[m2];
                    if (r !== undefined && r !== null) {
                        if (Math.abs(r) > Math.abs(maxCorr.val)) maxCorr = { val: r, m1, m2 };
                        if (r < minCorr.val) minCorr = { val: r, m1, m2 };
                    }
                }
            }

            if (maxCorr.m1 && Math.abs(maxCorr.val) >= 0.70) {
                const strength = Math.abs(maxCorr.val) >= 0.85 ? 'highly predictable' : 'strong';
                generatedInsights.push({
                    text: `A ${strength} regional trend exists between ${availableMetrics[maxCorr.m1]} and ${availableMetrics[maxCorr.m2]} (r = ${maxCorr.val.toFixed(2)}). In the parallel plot, you can see these lines running tightly together as a horizontal bundle, meaning elevated levels in one safely predict elevated levels in the other.`
                });
            }

            if (minCorr.m1 && minCorr.val <= -0.3) {
                generatedInsights.push({
                    text: `There is a notable inverse relationship between ${availableMetrics[minCorr.m1]} and ${availableMetrics[minCorr.m2]} (r = ${minCorr.val.toFixed(2)}). This produces the 'crisscrossing' X-pattern you see between their respective axes. Generally, as a well hits elevated levels in one, it drops in the other.`
                });
            }
        }

        if (generatedInsights.length === 0) {
            generatedInsights.push({
                text: "The selected parameters exhibit standard regional variance without extreme statistical anomalies or severe linear correlations. Focus on visually identifying any single lines completely detaching from the standard bundles."
            });
        }

        return generatedInsights;
    }, [plotData, selectedMetrics, availableMetrics]);

    return (
        <div className="detailed-analysis-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Suspense fallback={<div className="chart-placeholder-large"><Spinner size={40} color={metricColor} /><p>Loading Analytical View...</p></div>}>
                {metricId === 'water_level' && (
                    <WaterLevelAnalysisView
                        filters={filters}
                        metricColor={metricColor}
                    />
                )}
            </Suspense>

            <div className="analysis-controls" style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icons.Settings size={20} color={metricColor} />
                    <h3 style={{ margin: 0 }}>Parameter Selection</h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>(Select 2-8 parameters for Parallel Coordinates Plot)</span>
                </div>

                <div className="metrics-selector-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.entries(availableMetrics).map(([key, label]) => {
                        const isActive = selectedMetrics.includes(key);
                        return (
                            <button
                                key={key}
                                onClick={() => toggleMetric(key)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    border: `1px solid ${isActive ? metricColor : '#e2e8f0'}`,
                                    background: isActive ? `${metricColor}11` : 'white',
                                    color: isActive ? metricColor : '#64748b',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isActive ? <Icons.Check size={14} /> : <Icons.Plus size={14} />}
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="plot-display-container" style={{
                background: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                position: 'relative',
                minHeight: '400px'
            }}>
                {isLoading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255,255,255,0.7)', zIndex: 20,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '16px',
                        backdropFilter: 'blur(2px)'
                    }}>
                        <Spinner size={60} color={metricColor} />
                        <p style={{ marginTop: '16px', fontWeight: '600', color: '#1e293b' }}>Plotting Data...</p>
                    </div>
                )}

                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Icons.Activity size={22} color={metricColor} />
                            Parallel Coordinates Analysis
                        </h3>
                        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', marginLeft: '32px' }}>
                            Each line represents a single data point across all selected parameters. Useful for finding patterns and identifying data clusters.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: showInfo ? metricColor : '#94a3b8', transition: 'color 0.2s', padding: '4px' }}
                        title="How to interpret this plot"
                    >
                        <Icons.Info size={24} />
                    </button>
                </div>

                {showInfo && (
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${metricColor}`,
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px',
                        fontSize: '13px',
                        color: '#334155'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                            <Icons.HelpCircle size={16} color={metricColor} />
                            How to Interpret this Plot
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li><b>The Axes:</b> Each vertical line represents a parameter (e.g., pH, TDS). Values go from low at bottom to high at top.</li>
                            <li><b>The Lines:</b> Each colored line represents a single water sample, showing its values across all axes.</li>
                            <li><b>Parallel Ribbons:</b> Thick bundles of lines going straight across indicate a <b>positive correlation</b> (when one goes up, the other goes up).</li>
                            <li><b>Crisscrossing Lines:</b> Lines forming an 'X' pattern indicate a <b>negative correlation</b> (when one goes up, the other goes down).</li>
                            <li><b>Outliers:</b> Single lines that completely deviate from the established bundles are anomalies that may need investigation.</li>
                        </ul>
                    </div>
                )}

                <Suspense fallback={<div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={40} color={metricColor} /></div>}>
                    <ParallelCoordinatesPlot
                        data={plotData}
                        metrics={selectedMetrics}
                        labels={availableMetrics}
                        metricColor={metricColor}
                    />
                </Suspense>
            </div>

            {insights.length > 0 && (
                <div className="automated-summary" style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    borderLeft: `6px solid ${metricColor}`
                }}>
                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                        <Icons.Zap size={20} color={metricColor} />
                        Automated Data Interpretation
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {insights.map((insight, idx) => (
                            <p key={idx} style={{ margin: 0, fontSize: '14.5px', color: '#334155', lineHeight: '1.6' }}>
                                <strong style={{ color: '#0f172a' }}>Actionable Insight:</strong> {insight.text}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailedAnalysisView;
