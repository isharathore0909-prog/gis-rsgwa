import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import parallelCoordinates from 'highcharts/modules/parallel-coordinates';
import * as Icons from 'lucide-react';

// Initialize the parallel coordinates module
if (typeof Highcharts === 'object' && parallelCoordinates) {
    if (typeof parallelCoordinates === 'function') {
        parallelCoordinates(Highcharts);
    } else if (typeof parallelCoordinates.default === 'function') {
        parallelCoordinates.default(Highcharts);
    }
}

const ParallelCoordinatesPlot = ({ data, metrics, labels, metricColor = '#3b82f6' }) => {
    if (!data || !data.data_points || data.data_points.length === 0 || metrics.length < 2) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Icons.AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '16px', margin: '0 auto' }} />
                <p style={{ color: '#64748b' }}>No data available to construct plot.</p>
            </div>
        );
    }

    const { options } = useMemo(() => {
        // Prepare X-axis categories (the chosen parameters)
        const categories = metrics.map(m => labels[m] || m);

        // Prepare Y-axes for parallel coordinates (each dimension)
        const yAxis = metrics.map(m => ({
            title: {
                text: labels[m] || m,
                style: { fontWeight: 'bold' }
            },
            type: 'linear'
        }));

        // Limit to 500 lines to avoid massive lag
        const points = data.data_points.slice(0, 500);

        const series = points.map((p, i) => {
            const rowData = metrics.map(m => p[m] ?? null);

            // Extract location / identification info robustly
            const village = p.village || p.Village || 'N/A';
            const district = p.district || p.District || 'N/A';
            const wellId = p.well_id || p.site_name || p.id || `Location ${i + 1}`;

            return {
                name: wellId,
                village: village,
                district: district,
                wellId: wellId,
                data: rowData,
                color: metricColor,
                opacity: 0.3,
                marker: { enabled: false },
                shadow: false
            };
        });

        const chartOptions = {
            chart: {
                type: 'spline', // spline creates smooth lines, line creates straight ones
                parallelCoordinates: true,
                parallelAxes: {
                    lineWidth: 1,
                    gridLineWidth: 0,
                    title: {
                        reserveSpace: false,
                        y: -10
                    }
                },
                backgroundColor: 'transparent',
                height: 700
            },
            title: {
                text: null
            },
            xAxis: {
                categories: categories,
                offset: 10,
                labels: {
                    style: { fontWeight: 'bold', color: '#475569' }
                }
            },
            yAxis: yAxis,
            tooltip: {
                enabled: true,
                useHTML: true,
                formatter: function () {
                    const s = this.series;
                    // this.x is the axis index in parallel coordinates
                    const axisLabel = labels[metrics[this.x]] || metrics[this.x] || 'Value';
                    const val = this.y !== null && this.y !== undefined
                        ? Number(this.y).toFixed(3)
                        : 'N/A';
                    return `
                        <div style="min-width:200px; padding:4px 2px; font-family: inherit;">
                            <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:6px;">📍 ${s.userOptions.wellId}</div>
                            <table style="width:100%; font-size:12px; border-collapse:collapse;">
                                <tr><td style="color:#64748b; padding:2px 0;">Village</td><td style="font-weight:600; color:#1e293b; text-align:right;">${s.userOptions.village}</td></tr>
                                <tr><td style="color:#64748b; padding:2px 0;">District</td><td style="font-weight:600; color:#1e293b; text-align:right;">${s.userOptions.district}</td></tr>
                            </table>
                            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #e2e8f0; font-size:12px; color:#475569;">
                                ${axisLabel}: <strong style="color:#0f172a;">${val}</strong>
                            </div>
                        </div>`;
                }
            },
            plotOptions: {
                series: {
                    animation: false,
                    lineWidth: 1,
                    events: {
                        mouseOver: function () {
                            this.group.toFront();
                            this.update({ color: '#ef4444', opacity: 1, lineWidth: 3, zIndex: 999 }, false);
                            this.chart.redraw(false);
                        },
                        mouseOut: function () {
                            this.update({ color: metricColor, opacity: 0.3, lineWidth: 1, zIndex: 1 }, false);
                            this.chart.redraw(false);
                        }
                    },
                    states: {
                        hover: {
                            lineWidthPlus: 0,
                            halo: false
                        }
                    }
                }
            },
            legend: {
                enabled: false
            },
            credits: {
                enabled: false
            },
            series: series
        };

        return { options: chartOptions };
    }, [data, metrics, labels, metricColor]);

    return (
        <div style={{ width: '100%', height: '700px' }}>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
    );
};

export default ParallelCoordinatesPlot;
