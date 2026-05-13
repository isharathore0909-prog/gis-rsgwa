import React, { Suspense, lazy } from 'react';
import * as Icons from 'lucide-react';
import LocationNavbar from './LocationNavbar';
const WaterResourcesTables = lazy(() => import('./WaterResourcesTables'));
const RainfallCharts = lazy(() => import('./Charts/RainfallCharts'));
const GWRECharts = lazy(() => import('./Charts/GWRECharts'));
const WaterQualityCharts = lazy(() => import('./Charts/WaterQualityCharts'));
const WaterLevelCharts = lazy(() => import('./Charts/WaterLevelCharts'));
import MetricDataTable from './MetricDataTable';
const DetailedAnalysisView = lazy(() => import('./DetailedAnalysisView'));
import Spinner from '../Common/ChartSpinner';
import api from '../../api';
import './MetricDetailView.css';


const MetricDetailView = ({ metric, onBack, data, analysisResults, rechargeRecords = [], rechargeLoading = false, districtWaterLevelStats = [], filters = {} }) => {
    if (!metric) return null;

    const [isDetailedView, setIsDetailedView] = React.useState(false);
    const isWaterLevelView = metric.id === 'water_level';
    const isWaterQualityView = metric.id === 'water_quality';

    // Reset detailed view when metric changes
    React.useEffect(() => {
        setIsDetailedView(false);
    }, [metric.id]);


    // 1. District-wise Water Level Averages for Chart 2
    const districtWaterLevelData = React.useMemo(() => {
        if (!isWaterLevelView) return [];

        // If we have static state-wide stats, use them to remain "static" as requested
        if (districtWaterLevelStats && districtWaterLevelStats.length > 0) {
            return [...districtWaterLevelStats].sort((a, b) => b.value - a.value);
        }

        const yearData = analysisResults?.aquiferYearData?.data || [];
        if (!yearData.length) return [];

        const districtGroups = {};
        yearData.forEach(f => {
            const district = f.district;
            const wl = parseFloat(f.pre_monsoon || f.post_monsoon);
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
    }, [isWaterLevelView, analysisResults?.aquiferYearData, districtWaterLevelStats]);

    // 2. Fluoride vs Water Level correlation for Chart 3
    const fluorideWaterLevelCorrelation = React.useMemo(() => {
        if (!isWaterLevelView || !analysisResults?.aquiferYearData || !analysisResults?.waterQualityStats) return [];

        const qRecords = analysisResults.waterQualityStats.records || [];
        const yearData = analysisResults.aquiferYearData.data || [];

        if (qRecords.length === 0 || yearData.length === 0) return [];

        const waterLevelMap = {};
        yearData.forEach(item => {
            const village = item.village_name;
            const block = item.block;
            const wl = parseFloat(item.pre_monsoon || item.post_monsoon);
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
    }, [isWaterLevelView, analysisResults]);

    const fetchTableData = React.useCallback(async (page, pageSize = 10) => {
        // Only override fetching for heavily paginated point datasets
        if (metric.id !== 'water_quality' && metric.id !== 'water_level') return null;

        const params = { page, page_size: pageSize };

        if (filters.district_id) params.district_id = filters.district_id;
        else if (filters.district) params.district = filters.district;

        if (filters.block_id) params.block_id = filters.block_id;
        else if (filters.block) params.block = filters.block;

        if (filters.gp_id) params.gp_id = filters.gp_id;
        else if (filters.gramPanchayat) params.gp_id = filters.gramPanchayat;

        if (filters.village_id) params.village_id = filters.village_id;
        else if (filters.village) params.village_name = filters.village;

        try {
            let res;
            if (metric.id === 'water_quality') {
                res = await api.waterQuality.getRecords(params);
            } else {
                params.detailed = 'true';
                params.year = filters.year || 2024;
                res = await api.aquifer.getRecords(params);
            }
            if (res.results) return { items: res.results, count: res.count };
            return { items: Array.isArray(res) ? res : [], count: res.length || 0 };
        } catch (e) {
            console.error("Pagination fetch failed", e);
            return null;
        }
    }, [metric.id, filters]);

    const fetchRechargeData = React.useCallback(async (page, pageSize = 8) => {
        const params = { page, page_size: pageSize };

        if (filters.district_id) params.district_id = filters.district_id;
        else if (filters.district) params.district = filters.district;

        if (filters.block_id) params.block_id = filters.block_id;
        else if (filters.block) params.block = filters.block;

        if (filters.gp_id) params.gp_id = filters.gp_id;
        else if (filters.gramPanchayat) params.gp_id = filters.gramPanchayat;

        if (filters.village_id) params.village_id = filters.village_id;
        else if (filters.village) params.village_name = filters.village;

        try {
            const res = await api.rechargeStructure.getRecords(params);
            if (res.results) return { items: res.results, count: res.count };
            return { items: Array.isArray(res) ? res : [], count: res.length || 0 };
        } catch (e) {
            console.error("Recharge fetch failed", e);
            return null;
        }
    }, [filters]);

    const renderMetricCharts = () => {
        switch (metric.id) {
            case 'rainfall':
                return <RainfallCharts analysisResults={analysisResults} isLoading={analysisResults?.rainfallLoading} />;
            case 'gwre':
                return <GWRECharts analysisResults={analysisResults} isLoading={analysisResults?.gwreLoading} />;
            case 'water_quality':
                return <WaterQualityCharts data={data} analysisResults={analysisResults} metricColor={metric.color} isLoading={analysisResults?.waterQualityLoading} />;
            case 'water_level':
                return (
                    <WaterLevelCharts
                        analysisResults={analysisResults}
                        districtWaterLevelData={districtWaterLevelData}
                        metricColor={metric.color}
                        filters={filters}
                        isLoading={analysisResults?.aquiferLoading}
                    />
                );
            default:
                return (
                    <div className="chart-placeholder-large">
                        <div className="chart-empty-state">
                            <Spinner size={48} color={metric.color} />
                            <p style={{ marginTop: '16px' }}>Analysis charts loading for {metric.title}...</p>
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
                <LocationNavbar
                    metricId={metric.id}
                    isDetailedView={isDetailedView}
                    setIsDetailedView={setIsDetailedView}
                    showDetailedAnalysisBtn={isWaterLevelView || isWaterQualityView}
                />


                {metric.id === 'water_resources' ? (
                    <Suspense fallback={<div className="chart-placeholder-large"><Spinner size={40} color={metric.color} /><p>Loading Resources...</p></div>}>
                        <WaterResourcesTables
                            dams={data?.features?.filter(f => f.properties.Category === 'Dam') || []}
                            waterbodies={data?.features?.filter(f => f.properties.Category === 'Waterbody') || []}
                            canals={data?.features?.filter(f => f.properties.Category === 'Canal') || []}
                            micro={data?.features?.filter(f => f.properties.Category === 'Micro Structure') || []}
                            rechargeData={rechargeRecords}
                            fetchRechargeData={fetchRechargeData}
                            loading={{
                                recharge: rechargeLoading,
                                dams: !data,
                                waterbodies: !data,
                                canals: !data,
                                micro: !data
                            }}
                        />
                    </Suspense>
                ) : (
                    <>
                        <Suspense fallback={<div className="chart-placeholder-large"><Spinner size={40} color={metric.color} /><p>Preparing Analysis...</p></div>}>
                            {isDetailedView ? (
                                <DetailedAnalysisView
                                    metricId={metric.id}
                                    filters={filters}
                                    metricColor={metric.color}
                                />
                            ) : (
                                <div className="charts-grid">
                                    {renderMetricCharts()}
                                </div>
                            )}
                        </Suspense>
                        <MetricDataTable
                            data={data}
                            analysisResults={analysisResults}
                            title={metric.title}
                            fetchData={(metric.id === 'water_quality' || metric.id === 'water_level') ? fetchTableData : null}
                        />
                    </>
                )}

            </div>
        </div >
    );
};

export default MetricDetailView;
