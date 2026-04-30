import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import * as Icons from 'lucide-react';

const ScatterplotMatrix = ({ data, metrics, labels, metricColor = '#2563eb' }) => {
    if (!data || !metrics || metrics.length === 0) {
        return (
            <div className="splom-empty" style={{ padding: '40px', textAlign: 'center' }}>
                <Icons.AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>No data available for the selected parameters.</p>
            </div>
        );
    }

    const n = metrics.length;

    // Helper to get correlation color
    const getCorrelationColor = (r) => {
        if (r === null || r === undefined) return '#f1f5f9';
        // Map -1 to 1 to a blue-white-red gradient
        if (r > 0) {
            return `rgba(239, 68, 68, ${r})`; // Red with alpha
        } else {
            return `rgba(59, 130, 246, ${Math.abs(r)})`; // Blue with alpha
        }
    };

    return (
        <div className="splom-matrix-grid" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gridTemplateRows: `repeat(${n}, 1fr)`,
            gap: '8px',
            width: '100%',
            aspectRatio: '1 / 1',
            padding: '10px',
            background: '#f8fafc',
            borderRadius: '16px'
        }}>
            {metrics.map((rowMetric, rowIndex) => (
                metrics.map((colMetric, colIndex) => {
                    const isDiagonal = rowIndex === colIndex;
                    const isUpper = colIndex > rowIndex;
                    const isLower = rowIndex > colIndex;

                    return (
                        <div key={`${rowIndex}-${colIndex}`} className="splom-cell" style={{
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            position: 'relative',
                            minHeight: '80px'
                        }}>
                            {/* DIAGONAL: HISTOGRAM */}
                            {isDiagonal && data.histograms?.[rowMetric] && (
                                <div style={{ height: '100%', width: '100%', padding: '4px' }}>
                                    <div style={{ position: 'absolute', top: '4px', left: '0', right: '0', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: '#1e293b', zIndex: 5 }}>
                                        {labels[rowMetric] || rowMetric}
                                    </div>
                                    <HighchartsReact
                                        highcharts={Highcharts}
                                        options={{
                                            chart: { type: 'column', margin: [20, 5, 5, 5], backgroundColor: 'transparent', height: '100%' },
                                            title: { text: null },
                                            xAxis: { visible: false },
                                            yAxis: { visible: false },
                                            legend: { enabled: false },
                                            credits: { enabled: false },
                                            series: [{
                                                data: data.histograms[rowMetric].bins,
                                                color: '#94a3b8',
                                                borderRadius: 2,
                                                groupPadding: 0.1,
                                                pointPadding: 0
                                            }]
                                        }}
                                    />
                                </div>
                            )}

                            {/* LOWER TRIANGLE: SCATTER PLOT */}
                            {isLower && (
                                <div style={{ height: '100%', width: '100%', padding: '2px' }}>
                                    <HighchartsReact
                                        highcharts={Highcharts}
                                        options={{
                                            chart: { type: 'scatter', margin: [5, 5, 5, 5], backgroundColor: 'transparent', height: '100%' },
                                            title: { text: null },
                                            xAxis: { visible: false },
                                            yAxis: { visible: false },
                                            legend: { enabled: false },
                                            credits: { enabled: false },
                                            plotOptions: {
                                                scatter: {
                                                    marker: { radius: n > 5 ? 1.5 : 2.5, symbol: 'circle' }
                                                }
                                            },
                                            series: [{
                                                data: data.data_points.map(p => [p[colMetric], p[rowMetric]]).filter(d => d[0] !== undefined && d[1] !== undefined),
                                                color: metricColor,
                                                opacity: 0.6
                                            }]
                                        }}
                                    />
                                </div>
                            )}

                            {/* UPPER TRIANGLE: CORRELATION COEFFICIENT */}
                            {isUpper && (
                                <div style={{
                                    height: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: getCorrelationColor(data.matrix?.[rowMetric]?.[colMetric] || 0) + '11',
                                }}>
                                    <div style={{
                                        width: `${Math.max(15, Math.abs(data.matrix?.[rowMetric]?.[colMetric] || 0) * 80)}%`,
                                        aspectRatio: '1 / 1',
                                        borderRadius: '50%',
                                        background: getCorrelationColor(data.matrix?.[rowMetric]?.[colMetric] || 0),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        <span style={{
                                            fontSize: n > 5 ? '8px' : '11px',
                                            fontWeight: '800',
                                            color: Math.abs(data.matrix?.[rowMetric]?.[colMetric] || 0) > 0.4 ? 'white' : '#475569'
                                        }}>
                                            {data.matrix?.[rowMetric]?.[colMetric] ?? '0'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            ))}
        </div>
    );
};

export default ScatterplotMatrix;
