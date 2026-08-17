import React from 'react';
import MetricCard from './MetricCard';
import { dashboardGridConfig, DASHBOARD_METRICS } from '../../config/dashboardConfig';
import GWREPreview from './Previews/GWREPreview';
import RainfallPreview from './Previews/RainfallPreview';
import WaterQualityPreview from './Previews/WaterQualityPreview';
import WaterLevelPreview from './Previews/WaterLevelPreview';
import WaterResourcesPreview from './Previews/WaterResourcesPreview';
import RajasthanOverviewMap from '../Map/RajasthanOverviewMap';
import CardInlineLoader from '../Common/CardInlineLoader';
import './DashboardGrid.css';

const DashboardGrid = ({ onMetricClick, mapComponent, data, analysisResults, loadingStates = {} }) => {
    const [hoveredMetricId, setHoveredMetricId] = React.useState(null);

    const handleMouseEnter = (id) => setHoveredMetricId(id);
    const handleMouseLeave = () => setHoveredMetricId(null);

    // Helper to extract display values from simple metrics
    const getMetricValue = (id) => {
        const metricData = data[id];
        if (!metricData) return '---';
        if (Array.isArray(metricData)) return metricData.length.toLocaleString();
        if (typeof metricData === 'object') return Object.keys(metricData).length.toLocaleString();
        return '---';
    };

    const pieData = analysisResults?.pieData || [];

    // District-wise Water Level Averages for Water Level Card
    const districtWaterLevelData = React.useMemo(() => {
        if (data?.districtWaterLevelStats && data.districtWaterLevelStats.length > 0) {
            return [...data.districtWaterLevelStats].sort((a, b) => b.value - a.value);
        }

        const rawData = (analysisResults?.aquiferRecords && analysisResults.aquiferRecords.length > 0)
            ? analysisResults.aquiferRecords
            : (data?.water_level?.features || (Array.isArray(data?.water_level) ? data.water_level : []));

        if (!rawData || rawData.length === 0) return [];

        const districtGroups = {};
        rawData.forEach(f => {
            const props = f.properties || f;
            const district = props['District'] || props['district'] || props['district_name'] || props['DISTRICT'];
            const wl = parseFloat(
                props['Static WL'] ||
                props['avg_level'] ||
                props['pre_2024'] ||
                props['pst_2024'] ||
                props['avg_pre_monsoon'] ||
                props['well_depth']
            );

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
    }, [data.water_level, data.districtWaterLevelStats, analysisResults?.aquiferRecords]);

    const isMetricLoading = (item) => {
        const keyUpper = item.metricId;
        const keyLower = item.id;
        if (loadingStates && (loadingStates[keyUpper] || loadingStates[keyLower])) {
            return true;
        }

        // Show spinner if data for this metric has not loaded yet
        switch (item.metricId) {
            case 'GWRE':
                return !pieData || pieData.length === 0 || pieData.every(d => Number(d.value) === 0);
            case 'RAINFALL':
                return !analysisResults?.rainfallDistributionData || analysisResults.rainfallDistributionData.length === 0;
            case 'WATER_QUALITY':
                return !analysisResults?.qualityData || analysisResults.qualityData.length === 0;
            case 'WATER_LEVEL':
                return !districtWaterLevelData || districtWaterLevelData.length === 0;
            case 'WATER_RESOURCES':
                return !data?.water_resources && !data?.canalData && (!data?.allDams || data.allDams.length === 0);
            default:
                return false;
        }
    };

    const renderPreviewChart = (item, metric) => {
        if (isMetricLoading(item)) {
            return <CardInlineLoader message={`Loading ${metric?.title || 'Data'}...`} color={metric?.color} />;
        }

        switch (item.metricId) {
            case 'GWRE':
                return <GWREPreview pieData={pieData} />;
            case 'RAINFALL':
                return <RainfallPreview analysisResults={analysisResults} />;
            case 'WATER_QUALITY':
                return <WaterQualityPreview analysisResults={analysisResults} metricColor={metric.color} />;
            case 'WATER_LEVEL':
                return <WaterLevelPreview districtWaterLevelData={districtWaterLevelData} metricColor={metric.color} />;
            case 'WATER_RESOURCES':
                return <WaterResourcesPreview data={data} analysisResults={analysisResults} />;
            default:
                return (
                    <div className="chart-placeholder">
                        <div className="bar-skeleton"></div>
                        <div className="bar-skeleton short"></div>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-grid">
            {dashboardGridConfig.map((item) => {
                if (item.id === 'map') {
                    return (
                        <div
                            key={item.id}
                            className="grid-item map-item"
                            style={{ gridArea: item.area }}
                        >
                            <div className="item-header">
                                <h3>{item.title}</h3>
                            </div>
                            <div className="map-wrapper">
                                <RajasthanOverviewMap
                                    hoveredMetric={hoveredMetricId}
                                    damMarkers={data.allDams}
                                    gwreFeatures={analysisResults?.gwreFeatures?.features || []}
                                />
                            </div>
                        </div>
                    );
                }

                const metric = DASHBOARD_METRICS[item.metricId];
                const cardLoading = isMetricLoading(item);

                return (
                    <div
                        key={item.id}
                        className="grid-item"
                        style={{ gridArea: item.area }}
                    >
                        <MetricCard
                            {...metric}
                            onClick={onMetricClick}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            isLoading={cardLoading}
                            value={['gwre', 'rainfall', 'water_quality', 'water_level', 'water_resources'].includes(item.id) ? null : getMetricValue(item.id)}
                            trend={null}
                            trendLabel={item.metricId === 'WATER_RESOURCES' ? null : metric.trendLabel}
                        >
                            <div className="chart-preview-wrapper" style={{ height: 'auto', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                {renderPreviewChart(item, metric)}
                            </div>
                        </MetricCard>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardGrid;
