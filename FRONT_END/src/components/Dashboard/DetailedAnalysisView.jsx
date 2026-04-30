import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import ScatterplotMatrix from './Charts/ScatterplotMatrix';
import api from '../../api';

const DetailedAnalysisView = ({ metricId, filters, metricColor }) => {
    const [selectedMetrics, setSelectedMetrics] = useState([]);
    const [matrixData, setMatrixData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const wqMetrics = {
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

    const availableMetrics = wqMetrics;


    useEffect(() => {
        // Initial defaults
        setSelectedMetrics(['ph', 'tds', 'ec', 'hardness', 'fluoride']);
    }, []);


    useEffect(() => {
        if (selectedMetrics.length < 2) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchMatrix = async () => {
            setIsLoading(true);
            try {
                // Phase 1: Matrix & Histograms (Fast)
                const matrixRes = await api.waterQuality.getCorrelationMatrix({
                    'metrics[]': selectedMetrics,
                    district: filters.district || undefined,
                    block: filters.block || undefined,
                    include_points: 'false'
                }, signal);
                setMatrixData(matrixRes);

                // Phase 2: Full Data with Scatter Points (Background)
                const fullRes = await api.waterQuality.getCorrelationMatrix({
                    'metrics[]': selectedMetrics,
                    district: filters.district || undefined,
                    block: filters.block || undefined,
                    include_points: 'true',
                    limit: 500
                }, signal);

                // Update with points
                setMatrixData(fullRes);
            } catch (err) {
                if (err.name === 'AbortError' || err.message === 'canceled') {
                    return;
                }
                console.error("Failed to fetch matrix data:", err);
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        const timer = setTimeout(fetchMatrix, 500);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
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

    // Automated Insights Generation
    const insights = useMemo(() => {
        if (!matrixData || !matrixData.matrix) return [];

        const results = [];
        const seen = new Set();

        selectedMetrics.forEach(m1 => {
            selectedMetrics.forEach(m2 => {
                if (m1 === m2) return;
                const pairKey = [m1, m2].sort().join('-');
                if (seen.has(pairKey)) return;
                seen.add(pairKey);

                const r = matrixData.matrix[m1] ? matrixData.matrix[m1][m2] : null;
                if (r !== undefined && r !== null && Math.abs(r) >= 0.5) {
                    const strength = Math.abs(r) >= 0.8 ? 'strong' : 'moderate';
                    const direction = r > 0 ? 'positive' : 'negative';
                    results.push({
                        m1, m2, r,
                        text: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation between ${availableMetrics[m1]} and ${availableMetrics[m2]} (r = ${r})`
                    });
                }
            });
        });

        return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5);
    }, [matrixData, selectedMetrics, availableMetrics]);


    return (
        <div className="detailed-analysis-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="analysis-controls" style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icons.Settings size={20} color={metricColor} />
                    <h3 style={{ margin: 0 }}>Parameter Selection</h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>(Select 2-8 parameters for correlation matrix)</span>
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

            <div className="matrix-display-container" style={{
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
                        borderRadius: '16px'
                    }}>
                        <Icons.Loader2 size={48} className="animate-spin" color={metricColor} />
                        <p style={{ marginTop: '16px', fontWeight: '600', color: '#1e293b' }}>Recalculating Matrix...</p>
                    </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icons.Grid size={22} color={metricColor} />
                        Scatterplot Matrix Analysis
                    </h3>
                </div>

                <ScatterplotMatrix
                    data={matrixData}
                    metrics={selectedMetrics}
                    labels={availableMetrics}
                    metricColor={metricColor}
                />
            </div>

            {insights.length > 0 && (
                <div className="automated-summary" style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    borderLeft: `6px solid ${metricColor}`
                }}>
                    <h3 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                        <Icons.Zap size={20} color={metricColor} />
                        Automated Statistical Summary
                    </h3>
                    <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {insights.map((insight, idx) => (
                            <li key={idx} style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                                {insight.text}.
                                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>
                                    {Math.abs(insight.r) >= 0.8
                                        ? 'This suggests a very reliable predictable relationship.'
                                        : 'This indicates a notable trend but with higher variability.'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}


            <div className="statistical-legend" style={{
                padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'center', gap: '32px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                    <div style={{ width: '12px', height: '12px', background: '#94a3b8', borderRadius: '2px' }}></div>
                    <span>Histograms: Distribution</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                    <div style={{ width: '12px', height: '12px', border: `1px solid ${metricColor}`, borderRadius: '2px' }}></div>
                    <span>Scatter Plots: Bivariate Trends</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                    <div style={{ width: '24px', height: '12px', background: 'linear-gradient(90deg, #3b82f6, #f1f5f9, #ef4444)', borderRadius: '2px' }}></div>
                    <span>Correlation: -1 (Blue) to +1 (Red)</span>
                </div>
            </div>
        </div>
    );
};

export default DetailedAnalysisView;
