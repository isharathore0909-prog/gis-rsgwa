import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';
import SmartChartContainer from './Common/SmartChartContainer';

/**
 * GroundWaterSection - Standardized on Highcharts
 * Displays GWRE status, water level bars, aquifer area, and WQ compliance.
 */
const GroundWaterSection = ({
    isGWRE,
    pieData,
    totalBlocks,
    waterLevelChartData,
    aquiferData,
    qualityData,
    blockWaterQualityData,
    getParameterColor,
    isExpanded,
    isLoading
}) => {

    const isNoData = isGWRE && pieData.length === 1 && pieData[0].name === 'Data N/A';
    if (isNoData) return null;

    // Stage of Ground Water Extraction Donut Chart Options
    const pieOptions = useMemo(() => ({
        chart: { type: 'pie', backgroundColor: 'transparent', height: isExpanded ? 350 : 260 },
        title: { text: null },
        plotOptions: {
            pie: {
                innerSize: '65%',
                dataLabels: { enabled: false },
                showInLegend: false,
                borderWidth: 0,
                states: { hover: { brightness: 0.1 } }
            }
        },
        tooltip: {
            headerFormat: '',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {point.name}: <b>{point.y}</b>'
        },
        series: [{
            name: 'Status',
            data: pieData.map(d => ({ name: d.name, y: d.value, color: d.color })),
            animation: false
        }],
        credits: { enabled: false }
    }), [pieData, isExpanded]);

    // Ground Water Level Bar Chart Options
    const waterLevelOptions = useMemo(() => ({
        chart: { type: 'column', backgroundColor: 'transparent', height: isExpanded ? 350 : 260 },
        title: { text: null },
        xAxis: {
            categories: waterLevelChartData.map(d => d.name),
            labels: { style: { fontSize: '11px', color: '#64748b' } },
            lineWidth: 0,
            tickWidth: 0
        },
        yAxis: {
            reversed: true, // Crucial for mbgl (meters below ground level)
            title: { text: null },
            gridLineColor: '#f1f5f9',
            labels: { style: { fontSize: '11px', color: '#64748b' } }
        },
        plotOptions: {
            column: { borderRadius: 4, borderWidth: 0 }
        },
        tooltip: {
            shared: true,
            valueSuffix: ' mbgl'
        },
        series: [{
            name: 'Water Level',
            showInLegend: false,
            data: waterLevelChartData.map(d => ({ y: d.value, color: d.color })),
            animation: false
        }],
        credits: { enabled: false }
    }), [waterLevelChartData, isExpanded]);

    // Aquifers Present Horizontal Bar Chart Options
    const aquiferOptions = useMemo(() => ({
        chart: { type: 'bar', backgroundColor: 'transparent', height: isExpanded ? 420 : 300 },
        title: { text: null },
        xAxis: {
            categories: aquiferData.map(d => d.name),
            labels: { style: { fontSize: '10px', fontWeight: '500', color: '#475569' } },
            lineWidth: 0
        },
        yAxis: {
            title: { text: null },
            gridLineColor: '#f1f5f9',
            visible: false
        },
        plotOptions: {
            bar: { borderRadius: 4, borderWidth: 0 }
        },
        tooltip: {
            pointFormat: 'Area: <b>{point.y:,.0f} sq km</b>'
        },
        series: [{
            name: 'Area',
            showInLegend: false,
            data: aquiferData.map(d => ({ y: d.value, color: d.color || '#3b82f6' })),
            animation: false
        }],
        credits: { enabled: false }
    }), [aquiferData, isExpanded]);

    // Water Quality Compliance Horizontal Bar Chart Options
    const qualityOptions = useMemo(() => ({
        chart: { type: 'bar', backgroundColor: 'transparent', height: isExpanded ? 420 : 340 },
        title: { text: null },
        xAxis: {
            categories: qualityData.map(d => d.subject),
            labels: { style: { fontSize: '10px', fontWeight: '500', color: '#475569' } },
            lineWidth: 0
        },
        yAxis: {
            title: { text: null },
            max: 100,
            visible: false
        },
        plotOptions: {
            bar: { borderRadius: 4, borderWidth: 0 }
        },
        tooltip: {
            useHTML: true,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderWidth: 0,
            shadow: true,
            formatter: function () {
                const d = qualityData[this.point.index];
                return `<div style="padding: 5px;">
                    <p style="margin:0; font-weight:700; font-size:12px; color:#1e293b;">${d.subject}</p>
                    <p style="margin:5px 0 0 0; font-size:11px; color:#64748b;"><strong>Limit:</strong> ${d.label}</p>
                    <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;"><strong>Exceedance:</strong> <span style="color:#ef4444; font-weight:600;">${this.y}%</span> Stations</p>
                </div>`;
            }
        },
        series: [{
            name: 'Exceedance',
            showInLegend: false,
            data: qualityData.map(d => ({ y: d.value, color: '#f4a261' })),
            animation: false
        }],
        credits: { enabled: false }
    }), [qualityData, isExpanded]);

    return (
        <div className={`groundwater-analysis-grid animated-entry ${isExpanded ? 'is-expanded' : ''}`}>
            {pieData.length > 0 && (
                <AnalysisCard title={isGWRE ? 'Stage of Ground Water Extraction' : 'Ground Water Status'}>
                    <SmartChartContainer height={isExpanded ? '350px' : '260px'} className="pie-chart-wrapper" isLoading={isLoading}>
                        <HighchartsReact highcharts={Highcharts} options={pieOptions} />
                    </SmartChartContainer>

                    <div className="card-legend-wrapper">
                        {pieData.map((entry, index) => (
                            <div key={index} className="legend-item-inline">
                                <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                                {entry.name}
                            </div>
                        ))}
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
            )}

            <AnalysisCard title="Ground Water Level (mbgl)">
                <SmartChartContainer height={isExpanded ? '350px' : '260px'} className="bar-chart-wrapper" isLoading={isLoading}>
                    <HighchartsReact highcharts={Highcharts} options={waterLevelOptions} />
                </SmartChartContainer>
                <div className="status-summary-grid" style={{ marginTop: '1rem' }}>
                    {waterLevelChartData.map((d, i) => (
                        <MiniStatusCard key={i} value={d.value} label={d.name} color={d.color} />
                    ))}
                </div>
            </AnalysisCard>

            <AnalysisCard title="Aquifers Present">
                <SmartChartContainer height={isExpanded ? '420px' : '300px'} className="bar-chart-wrapper" isLoading={isLoading}>
                    <HighchartsReact highcharts={Highcharts} options={aquiferOptions} />
                </SmartChartContainer>
                <div className="aquifer-details-list" style={{ marginTop: '0.5rem' }}>
                    {aquiferData.map((d, i) => (
                        <div key={i} className="aquifer-detail-item">
                            <div className="detail-header">
                                <span className="dot" style={{ backgroundColor: d.color }}></span>
                                <span className="name">{d.name}</span>
                            </div>
                            <div className="detail-stats">
                                <span className="area">{d.value ? Number(d.value).toLocaleString() : '0'} <small>{d.unit || 'sq km'}</small></span>
                                <span className="percent">{d.percent}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </AnalysisCard>

            <AnalysisCard title="Water Quality Compliance">
                <SmartChartContainer height={isExpanded ? '420px' : '340px'} className="bar-chart-wrapper" isLoading={isLoading}>
                    <HighchartsReact highcharts={Highcharts} options={qualityOptions} />
                </SmartChartContainer>
                <div className="status-summary-grid" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                    {qualityData.map((d, i) => (
                        <MiniStatusCard key={i} value={`${d.value}%`} label={d.subject} color="#f4a261" />
                    ))}
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
                                style={{ gridColumn: isExpanded ? 'span 1' : '1 / -1' }}
                            />
                        )}
                        {blockWaterQualityData.status && (
                            <MiniStatusCard
                                value={blockWaterQualityData.status.text}
                                label={blockWaterQualityData.status.issues.length > 0
                                    ? blockWaterQualityData.status.issues.join(', ')
                                    : 'All parameters within safe limits'}
                                color={blockWaterQualityData.status.status === 'good' ? '#2a9d8f' : blockWaterQualityData.status.status === 'warning' ? '#f4a261' : '#e63946'}
                                style={{ gridColumn: isExpanded ? 'span 1' : '1 / -1' }}
                            />
                        )}
                    </div>

                    <div className="aquifer-details-list">
                        {[
                            { id: 'ec', name: 'Electrical Conductivity (EC)', unit: 'µs/cm', threshold: 3000 },
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

export default React.memo(GroundWaterSection);
