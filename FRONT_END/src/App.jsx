import React, { useMemo, Suspense, lazy } from 'react';

// Components
import Header from './components/Header';
import LoadingOverlay from './components/Common/ChartLoadingOverlay';
import ToastContainer from './components/Common/ToastContainer';

// Lazy load heavy components
const DashboardContainer = lazy(() => import('./components/Dashboard/DashboardContainer'));
const MapView = lazy(() => import('./components/Map/MapView'));
const PortalLayout = lazy(() => import('./components/GisPortal/PortalLayout'));
import {
    useBoundaryHierarchy, useAppLogic, useSpatialLayerStats
} from './hooks';
import { useMapDataFetch } from './hooks/data/useMapDataFetch';
import { useAppAnalysis } from './hooks/ui/useAppAnalysis';

// Styles
import './App.css';

// Context
import { AppContextProvider, useAppContext } from './context/AppContext';
import Highcharts from 'highcharts';
import Highcharts3D from 'highcharts/highcharts-3d';

// Initialize 3D module globally
if (typeof Highcharts3D === 'function') {
    Highcharts3D(Highcharts);
} else if (Highcharts3D && typeof Highcharts3D.default === 'function') {
    Highcharts3D.default(Highcharts);
}

// Global Highcharts configuration to suppress accessibility warning
Highcharts.setOptions({
    accessibility: { enabled: false }
});

function AppContent() {
    const {
        filters, setFilters, clickedLocation, setClickedLocation, viewMode, setViewMode
    } = useAppContext();

    // Initial routing for dashboard metrics - run once on mount
    React.useEffect(() => {
        const path = window.location.pathname.replace('/', '');
        if (['gwre', 'rainfall', 'water-resources', 'water-quality', 'well-inventory', 'water_resources', 'water_quality', 'water_level'].includes(path)) {
            setViewMode('dashboard');
        }
    }, []); // Only run on mount to set initial view

    const isWaterResourcesActive = filters.type === 'Water Resources';

    const { stats: canalStats, features: canalFeatures } = useSpatialLayerStats(viewMode === 'dashboard', 'canal', filters, isWaterResourcesActive);
    const { stats: waterbodyStats, features: waterbodyFeatures } = useSpatialLayerStats(viewMode === 'dashboard', 'waterbody', filters, isWaterResourcesActive);

    const {
        handleLayerChange, handleFiltersApply, handleBasemapChange,
        handleAddToTable, neighbors, setNeighbors, processedBlockData, rajasthanData,
        rajasthanId, rainfallPoints, selectedDams,
        tableSelection, microData, selectedWellInventory,
        aquiferRecords, waterQualityRecords, rainfallLoading, waterQualityLoading, aquiferLoading, waterResourcesLoading: parentWaterResourcesLoading,
        rechargeRecords, rechargeLoading, districtWaterLevelStats,
        rainfallDataSource, rainfallStations, rainfallStationRecords,
        handleRemoveRow, handleToggleSelection, handleToggleWellInventory, handleClearWellInventory,
        handleSetWellInventory, handleCoordinateSearch, searchCoordinates
    } = useAppLogic();

    const {
        loading: boundariesLoading,
        currentLevel,
    } = useBoundaryHierarchy(filters);

    const {
        canalLoading, waterbodyLoading,
        damMarkers
    } = useMapDataFetch({
        filters, rainfallPoints, blockBoundaryData: processedBlockData, rajasthanData,
        dynamicBoundaries: null, rainfallStations, rainfallStationRecords,
        legendFeature: filters.legendFeature || 'Category', isLoading: parentWaterResourcesLoading
    });

    const waterResourcesLoading = parentWaterResourcesLoading || canalLoading || waterbodyLoading;

    // Only block the map for data it must have before it can render.
    const mapDataLoading =
        (filters.type === 'Rainfall' && rainfallLoading) ||
        (filters.type === 'Water Resources' && waterResourcesLoading) ||
        (filters.type === 'Well Inventory' && aquiferLoading);

    const {
        analysisResults,
        handleLocationClick
    } = useAppAnalysis({
        filters, clickedLocation, neighbors, selectedBoundary: null, processedBlockData,
        rainfallPoints, rainfallStations, rainfallStationRecords, rainfallDataSource,
        rainfallLoading, waterQualityLoading, aquiferLoading, waterResourcesLoading,
        rajasthanId, waterQualityRecords, aquiferRecords, selectedDams,
        microData, tableSelection,
        setClickedLocation, setNeighbors
    });

    const [exportTrigger, setExportTrigger] = React.useState(null);

    const loadingStates = useMemo(() => ({
        GWRE: Boolean(analysisResults?.gwreLoading),
        gwre: Boolean(analysisResults?.gwreLoading),
        RAINFALL: Boolean(analysisResults?.rainfallLoading || rainfallLoading),
        rainfall: Boolean(analysisResults?.rainfallLoading || rainfallLoading),
        WATER_QUALITY: Boolean(analysisResults?.waterQualityLoading || waterQualityLoading),
        water_quality: Boolean(analysisResults?.waterQualityLoading || waterQualityLoading),
        WATER_LEVEL: Boolean(analysisResults?.aquiferLoading || aquiferLoading),
        water_level: Boolean(analysisResults?.aquiferLoading || aquiferLoading),
        WATER_RESOURCES: Boolean(waterResourcesLoading || analysisResults?.rechargeLoading),
        water_resources: Boolean(waterResourcesLoading || analysisResults?.rechargeLoading),
        recharge: Boolean(rechargeLoading || analysisResults?.rechargeLoading)
    }), [
        analysisResults?.gwreLoading,
        analysisResults?.rainfallLoading,
        analysisResults?.waterQualityLoading,
        analysisResults?.aquiferLoading,
        analysisResults?.rechargeLoading,
        rainfallLoading,
        waterQualityLoading,
        aquiferLoading,
        waterResourcesLoading,
        rechargeLoading
    ]);

    const mapComponent = useMemo(() => (
        <Suspense fallback={<LoadingOverlay message="Loading Map..." />}>
            <MapView
                onLocationClick={handleLocationClick}
                blockBoundaryData={processedBlockData}
                rajasthanData={rajasthanData}
                currentLevel={currentLevel}
                rainfallPoints={rainfallPoints}
                rainfallDataSource={rainfallDataSource}
                numClasses={5}
                rainfallStations={rainfallStations}
                rainfallStationRecords={rainfallStationRecords}
                microData={microData}
                onAddToTable={handleAddToTable}
                isLoading={boundariesLoading || mapDataLoading}
                searchCoordinates={searchCoordinates}
                selectedWellInventory={selectedWellInventory}
                onToggleWellInventory={handleToggleWellInventory}
                aquiferRecords={aquiferRecords}
                waterQualityRecords={waterQualityRecords}
                exportTrigger={exportTrigger}
                onFiltersApply={handleFiltersApply}
            />
        </Suspense>
    ), [
        handleLocationClick, processedBlockData, rajasthanData, currentLevel,
        rainfallPoints, rainfallDataSource, rainfallStations, rainfallStationRecords, microData,
        handleAddToTable, boundariesLoading,
        rainfallLoading, waterQualityLoading, aquiferLoading, waterResourcesLoading, mapDataLoading,
        searchCoordinates, selectedWellInventory, handleToggleWellInventory,
        aquiferRecords, waterQualityRecords, exportTrigger, handleFiltersApply
    ]);

    return (
        <div className="app-container">
            <Header />
            <ToastContainer />
            <Suspense fallback={<LoadingOverlay message="Initializing Application..." />}>
                {viewMode === 'dashboard' ? (
                    <div className="main-layout dashboard-layout">
                        <DashboardContainer
                            mapComponent={mapComponent}
                            analysisResults={analysisResults}
                            rainfall={rainfallStationRecords}
                            rainfallStations={rainfallStations}
                            rainfallPoints={rainfallPoints}
                            gwre={processedBlockData}
                            water_quality={waterQualityRecords}
                            water_level={aquiferRecords}
                            rechargeRecords={rechargeRecords}
                            rechargeLoading={rechargeLoading}
                            selectedDams={selectedDams}
                            allDams={damMarkers}
                            canalStats={canalStats}
                            waterbodyStats={waterbodyStats}
                            canalFeatures={canalFeatures}
                            waterbodyFeatures={waterbodyFeatures}
                            microData={microData}
                            filters={filters}
                            setFilters={setFilters}
                            setClickedLocation={setClickedLocation}
                            setNeighbors={setNeighbors}
                            districtWaterLevelStats={districtWaterLevelStats}
                            loadingStates={loadingStates}
                        />
                    </div>
                ) : (
                    <div className="main-layout portal-layout-container">
                        <PortalLayout
                            mapComponent={mapComponent}
                            analysisResults={analysisResults}
                            neighbors={neighbors}
                            selectedBoundary={null}
                            processedBlockData={processedBlockData}
                            rainfallPoints={rainfallPoints}
                            rainfallStations={rainfallStations}
                            rainfallStationRecords={rainfallStationRecords}
                            rainfallDataSource={rainfallDataSource}
                            handleLayerChange={handleLayerChange}
                            handleFiltersApply={handleFiltersApply}
                            handleBasemapChange={handleBasemapChange}
                            handleCoordinateSearch={handleCoordinateSearch}
                            handleToggleWellInventory={handleToggleWellInventory}
                            handleClearWellInventory={handleClearWellInventory}
                            handleSetWellInventory={handleSetWellInventory}
                            rainfallLoading={rainfallLoading}
                            waterQualityLoading={waterQualityLoading}
                            aquiferLoading={aquiferLoading}
                        />
                    </div>
                )}
            </Suspense>
        </div>
    );
}

function App() {
    return (
        <AppContextProvider>
            <AppContent />
        </AppContextProvider>
    );
}

export default App;
