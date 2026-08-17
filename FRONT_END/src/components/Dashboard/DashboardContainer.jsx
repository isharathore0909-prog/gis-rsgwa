import React, { useState, useMemo, memo, Suspense, lazy } from 'react';
import DashboardGrid from './DashboardGrid';
const MetricDetailView = lazy(() => import('./MetricDetailView'));
import { DASHBOARD_METRICS } from '../../config/dashboardConfig';
import LoadingOverlay from '../Common/ChartLoadingOverlay';
import { processGWREData } from '../../utils/processors/processGWREData';
import { processRainfallData } from '../../utils/processors/processRainfallData';
import { processWaterQualityData, processWellInventoryData } from '../../utils/processors/processQualityWellData';
import { processWaterResourcesData } from '../../utils/processors/processWaterResourcesData';
import './DashboardContainer.css';

const DashboardContainer = memo(({
    mapComponent,
    analysisResults,
    rainfall,
    rainfallStations,
    rainfallPoints,
    gwre,
    water_quality,
    water_level,
    rechargeRecords,
    rechargeLoading,
    selectedDams,
    allDams,
    canalStats,
    waterbodyStats,
    canalFeatures = [],
    waterbodyFeatures = [],
    microData,
    selectedBoundary,
    filters,
    setFilters,
    setClickedLocation,
    setNeighbors,
    districtWaterLevelStats,
    loadingStates = {}
}) => {
    // Initial active metric from URL path
    const getInitialMetric = () => {
        const path = window.location.pathname.replace('/', '').toLowerCase();
        const pathMap = {
            'gwre': 'gwre',
            'rainfall': 'rainfall',
            'water-quality': 'water_quality',
            'water-level': 'water_level',
            'water-resources': 'water_resources',
            'well-inventory': 'water_level',
            'water_quality': 'water_quality',
            'water_level': 'water_level',
            'water_resources': 'water_resources'
        };
        return pathMap[path] ? pathMap[path] : null;
    };

    const [activeMetricId, setActiveMetricId] = useState(getInitialMetric());

    // Sync with browser back/forward buttons
    React.useEffect(() => {
        const handlePopState = () => {
            setActiveMetricId(getInitialMetric());
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleMetricClick = (id) => {
        setActiveMetricId(id);

        const slugMap = {
            'gwre': 'gwre',
            'rainfall': 'rainfall',
            'water_quality': 'water-quality',
            'water_level': 'water-level',
            'water_resources': 'water-resources'
        };
        const targetSlug = slugMap[id] || id;

        // Clear administrative drill-down so the new layer always starts at state level
        const adminReset = {
            district: '', districtId: null, districtCode: null,
            block: '', blockId: null, blockCode: null,
            gramPanchayat: '', gpId: null, gpCode: null,
            village: '', vlgId: null
        };

        // Update URL path
        window.history.pushState(null, '', `/${targetSlug}`);

        if (id === 'gwre') {
            setFilters(prev => ({ ...prev, ...adminReset, type: 'Ground Water Resource Estimation' }));
        } else if (id === 'rainfall') {
            setFilters(prev => ({ ...prev, ...adminReset, type: 'Rainfall' }));
        } else if (id === 'water_quality') {
            setFilters(prev => ({ ...prev, ...adminReset, type: 'Water Quality' }));
        } else if (id === 'water_level') {
            setFilters(prev => ({ ...prev, ...adminReset, type: 'Well Inventory' }));
        } else if (id === 'water_resources') {
            setFilters(prev => ({
                ...prev,
                ...adminReset,
                type: 'Water Resources',
                showDams: true,
                showCanals: false,
                showWaterbodies: false,
                showMicro: false,
                showRecharge: false
            }));
        }
    };

    const handleBackToDashboard = () => {
        setActiveMetricId(null);
        // Clear URL path
        window.history.pushState(null, '', '/');
        // Reset all spatial filters and type to return to default data
        setFilters(prev => ({
            ...prev,
            type: '',
            district: '', districtId: null, districtCode: null,
            block: '', blockId: null, blockCode: null,
            gramPanchayat: '', gpId: null, gpCode: null,
            village: '', vlgId: null,
            showDams: false,
            showCanals: false,
            showWaterbodies: false,
            showMicro: false
        }));

        // Reset clicked location and neighbors to return to aggregated "All District" view
        if (setClickedLocation) setClickedLocation(null);
        if (setNeighbors) setNeighbors([]);
    };

    // Prepare processed data for specific metrics that need normalization
    const processedData = useMemo(() => {
        const id = activeMetricId;
        if (!id) return null;

        const currentFilters = filters || { type: '' };

        // Helper to ensure GeoJSON structure for processors that expect it
        const toFeatureCollection = (data) => {
            if (!data) return { type: 'FeatureCollection', features: [] };
            if (data.features) return data;
            if (Array.isArray(data)) return { type: 'FeatureCollection', features: data };
            return { type: 'FeatureCollection', features: [] };
        };

        switch (id) {
            case 'gwre':
                return processGWREData(
                    { ...currentFilters, type: 'Ground Water Resource Estimation' },
                    toFeatureCollection(gwre),
                    toFeatureCollection(analysisResults?.gwreFeatures)
                );
            case 'rainfall':
                return processRainfallData(
                    { ...currentFilters, type: 'Rainfall' },
                    [],
                    rainfallPoints || [],
                    rainfallStations || [],
                    rainfall || [],
                    analysisResults?.intersectingStationIds,
                    analysisResults?.rainfallStats
                );
            case 'water_quality':
                return processWaterQualityData(
                    { ...currentFilters, type: 'Water Quality' },
                    water_quality || []
                );
            case 'water_level':
                return processWellInventoryData(
                    { ...currentFilters, type: 'Well Inventory' },
                    water_level || []
                );
            case 'water_resources':
                return processWaterResourcesData(
                    { ...currentFilters, type: 'Water Resources', showDams: true, showCanals: true, showWaterbodies: true, showMicro: true },
                    toFeatureCollection(gwre),
                    selectedDams || [],
                    toFeatureCollection(waterbodyFeatures),
                    toFeatureCollection(canalFeatures),
                    toFeatureCollection(microData),
                    selectedBoundary
                );
            default:
                return null;
        }
    }, [
        activeMetricId, filters, gwre, analysisResults, rainfallPoints,
        rainfallStations, rainfall, water_quality, water_level,
        selectedDams, canalFeatures, waterbodyFeatures, microData, selectedBoundary
    ]);

    return (
        <div className="dashboard-container">
            {!activeMetricId ? (
                <DashboardGrid
                    onMetricClick={handleMetricClick}
                    mapComponent={mapComponent}
                    data={{
                        rainfall,
                        gwre,
                        water_quality,
                        water_level,
                        selectedDams,
                        allDams,
                        canalData: canalStats,
                        water_resources: waterbodyStats,
                        microData,
                        districtWaterLevelStats
                    }}
                    analysisResults={analysisResults}
                    loadingStates={loadingStates}
                />
            ) : (
                (() => {
                    const currentMetric = DASHBOARD_METRICS[activeMetricId.toUpperCase()];
                    return (
                        <Suspense fallback={<LoadingOverlay message={`Loading ${currentMetric?.title || 'Analysis'}...`} />}>
                            <MetricDetailView
                                metric={currentMetric}
                                onBack={handleBackToDashboard}
                                data={processedData}
                                analysisResults={analysisResults}
                                rechargeRecords={rechargeRecords.map(r => {
                                    const props = r.properties || r;
                                    return {
                                        ...r,
                                        structure_name: props.structure_type || props.structure_name || props.name || props.NAME || '---',
                                        district: props.district_name || props.district || props.dist_name || props.DIST_NAME || '---',
                                        block: props.block_name || props.block || props.BLOCK_NAME || '---',
                                        status: props.status || props.structure_status || props.STATUS || '---'
                                    };
                                })}
                                rechargeLoading={rechargeLoading}
                                waterQualityRaw={water_quality}
                                waterLevelRaw={water_level}
                                districtWaterLevelStats={districtWaterLevelStats}
                                filters={filters}
                            />
                        </Suspense>
                    );
                })()
            )}
        </div>
    );
});

export default DashboardContainer;
