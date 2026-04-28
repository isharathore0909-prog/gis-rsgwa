import React from 'react';
import * as Icons from 'lucide-react';
import LocationNavbar from './LocationNavbar';
import WaterResourcesTables from './WaterResourcesTables';
import RainfallCharts from './Charts/RainfallCharts';
import GWRECharts from './Charts/GWRECharts';
import WaterQualityCharts from './Charts/WaterQualityCharts';
import WaterLevelCharts from './Charts/WaterLevelCharts';
import MetricDataTable from './MetricDataTable';
import './MetricDetailView.css';

const MetricDetailView = ({ metric, onBack, data, analysisResults, rechargeRecords = [], rechargeLoading = false }) => {
    if (!metric) return null;

    const isWaterLevelView = metric.id === 'water_level';

    // 1. District-wise Water Level Averages for Chart 2
    const districtWaterLevelData = React.useMemo(() => {
        if (!isWaterLevelView || !data?.features) return [];

        const districtGroups = {};
        data.features.forEach(f => {
            const district = f.properties['District'];
            const wl = parseFloat(f.properties['Static WL'] || f.properties['avg_level']);
            if (district && district !== '-' && !isNaN(wl)) {
                if (!districtGroups[district]) {
                    districtGroups[district] = { sum: 0, count: 0 };
                }
                districtGroups[district].sum += wl;
                districtGroups[district].count += 1;
            }
        });

        return Object.entries(districtGroups)
            .map(([name, stats]) => ({
                name,
                value: parseFloat((stats.sum / stats.count).toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);
    }, [isWaterLevelView, data]);

    // 2. Fluoride vs Water Level correlation for Chart 3
    const fluorideWaterLevelCorrelation = React.useMemo(() => {
        if (!isWaterLevelView || !data?.features || !analysisResults?.waterQualityStats) return [];

        const qRecords = analysisResults.waterQualityStats.records || [];
        const wFeatures = data.features;

        if (qRecords.length === 0 || wFeatures.length === 0) return [];

        const waterLevelMap = {};
        wFeatures.forEach(wf => {
            const village = wf.properties['Village'];
            const block = wf.properties['Block'];
            const wl = parseFloat(wf.properties['Static WL']);
            if (wl && village && village !== '-') {
                waterLevelMap[village] = wl;
            } else if (wl && block && block !== '-') {
                if (!waterLevelMap[block]) waterLevelMap[block] = wl;
            }
        });

        const correlationPoints = [];
        qRecords.forEach(qr => {
            const fluoride = parseFloat(qr.fluoride);
            const village = qr.village_name || qr.village;
            const block = qr.block_name || qr.block;

            if (!isNaN(fluoride)) {
                const wl = waterLevelMap[village] || waterLevelMap[block];
                if (wl) {
                    correlationPoints.push([wl, fluoride]);
                }
            }
        });

        return correlationPoints;
    }, [isWaterLevelView, data, analysisResults]);

    const renderMetricCharts = () => {
        switch (metric.id) {
            case 'rainfall':
                return <RainfallCharts analysisResults={analysisResults} />;
            case 'gwre':
                return <GWRECharts analysisResults={analysisResults} />;
            case 'water_quality':
                return <WaterQualityCharts data={data} analysisResults={analysisResults} metricColor={metric.color} />;
            case 'water_level':
                return (
                    <WaterLevelCharts
                        analysisResults={analysisResults}
                        districtWaterLevelData={districtWaterLevelData}
                        fluorideCorrelation={fluorideWaterLevelCorrelation}
                        metricColor={metric.color}
                    />
                );
            default:
                return (
                    <div className="chart-placeholder-large">
                        <div className="chart-empty-state">
                            <Icons.BarChart2 size={48} opacity={0.2} />
                            <p>Analysis charts loading for {metric.title}...</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="metric-detail-view" style={{ '--metric-color': metric.color }}>
            <div className="detail-header">
                <button className="back-button" onClick={onBack}>
                    <Icons.ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
                <div className="detail-title">
                    <div className="icon-wrapper">
                        {React.createElement(Icons[metric.icon] || Icons.Circle, { size: 24, color: metric.color })}
                    </div>
                    <h1>{metric.title} Analysis</h1>
                </div>
            </div>

            <div className="detail-content">
                <LocationNavbar metricId={metric.id} />

                {metric.id === 'water_resources' ? (
                    <WaterResourcesTables
                        dams={data?.features?.filter(f => f.properties.Category === 'Dam') || []}
                        waterbodies={data?.features?.filter(f => f.properties.Category === 'Waterbody') || []}
                        canals={data?.features?.filter(f => f.properties.Category === 'Canal') || []}
                        micro={data?.features?.filter(f => f.properties.Category === 'Micro Structure') || []}
                        rechargeData={rechargeRecords}
                        loading={{
                            recharge: rechargeLoading,
                            dams: !data,
                            waterbodies: !data,
                            canals: !data,
                            micro: !data
                        }}
                    />
                ) : (
                    <>
                        <div className="charts-grid">
                            {renderMetricCharts()}
                        </div>
                        <MetricDataTable
                            data={data}
                            analysisResults={analysisResults}
                            title={metric.title}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default MetricDetailView;
