import React, { useMemo, Suspense, lazy, useCallback } from 'react';

// Components
import Header from './components/Header';
import ControlsSidebar from './components/ControlsSidebar';
import DataAnalysisSidebar from './components/DataAnalysisSidebar';
import MapView from './components/Map/MapView';

// Hooks
import { useBoundaryHierarchy, useAppLogic, useDataAnalysis } from './hooks';
import { useMapDataFetch } from './hooks/data/useMapDataFetch';

// Styles
import './App.css';

// Context
import { AppContextProvider, useAppContext } from './context/AppContext';

// Utils
import { getAttributeData } from './utils/dataProcessors';
import { exportToCSV } from './utils/exportUtils';

// Lazy load heavy components
const AttributeTable = lazy(() => import('./components/AttributeTable'));

function AppContent() {
    const {
        filters, layers, basemap,
        clickedLocation, setClickedLocation,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed
    } = useAppContext();

    const {
        setFilters, handleLayerChange, handleFiltersApply, handleBasemapChange,
        handleAddToTable, neighbors, setNeighbors, processedBlockData, rajasthanData,
        rajasthanId, activeCategory, isProceedClicked, rainfallPoints, selectedDams,
        tableSelection, microData, selectedWellInventory,
        aquiferRecords, waterQualityRecords, rainfallLoading, waterQualityLoading, aquiferLoading, waterResourcesLoading: parentWaterResourcesLoading,
        rainfallDataSource, rainfallStations, rainfallStationRecords,
        handleRemoveRow, handleToggleSelection, handleToggleWellInventory, handleClearWellInventory,
        handleSetWellInventory, handleCoordinateSearch, searchCoordinates
    } = useAppLogic();

    // Use hierarchical boundary hook
    const {
        boundaries: dynamicBoundaries,
        selectedBoundary,
        selectedLevel,
        loading: boundariesLoading,
        currentLevel,
        hierarchy
    } = useBoundaryHierarchy(filters, rajasthanId);

    const {
        aggregatedRainfallPoints, stationRainfallPoints,
        damMarkers, canalData, waterbodyData, canalLoading, waterbodyLoading,
        validatedBoundaries, validatedRajasthanData,
        selectedDistrictData, validatedBlockData
    } = useMapDataFetch({
        filters, rainfallPoints, blockBoundaryData: processedBlockData, rajasthanData,
        dynamicBoundaries, rainfallStations, rainfallStationRecords,
        legendFeature: 'Category', isLoading: parentWaterResourcesLoading
    });

    const waterResourcesLoading = parentWaterResourcesLoading || canalLoading || waterbodyLoading;

    // Lift analysis logic to share between Map and Sidebar
    const analysisResults = useDataAnalysis({
        globalFilters: filters,
        clickedLocation,
        neighbors,
        selectedBoundary,
        blockData: processedBlockData,
        rainfallPoints,
        rainfallStations,
        rainfallStationRecords,
        rainfallDataSource,
        parentRainfallLoading: rainfallLoading,
        parentWaterQualityLoading: waterQualityLoading,
        parentAquiferLoading: aquiferLoading,
        parentRechargeLoading: waterResourcesLoading,
        rajasthanId // Pass the backend readiness signal
    });

    // Memoize attribute data
    const attributeData = useMemo(() =>
        getAttributeData(
            filters, processedBlockData, neighbors, rainfallPoints,
            waterQualityRecords, aquiferRecords, selectedDams,
            canalData, waterbodyData, microData,
            rainfallStations, rainfallStationRecords,
            analysisResults?.intersectingStationIds,
            analysisResults?.rainfallStats,
            selectedBoundary,
            analysisResults?.gwreFeatures
        ),
        [
            filters, processedBlockData, neighbors, rainfallPoints,
            waterQualityRecords, aquiferRecords, selectedDams,
            canalData, waterbodyData, microData,
            rainfallStations, rainfallStationRecords,
            analysisResults?.intersectingStationIds,
            analysisResults?.rainfallStats,
            selectedBoundary,
            analysisResults?.gwreFeatures
        ]
    );

    const onExportData = useCallback(async () => {
        if (!attributeData?.features?.length) {
            alert("No data available to export.");
            return;
        }

        let featuresToExport = attributeData.features;
        if (tableSelection?.length) {
            featuresToExport = attributeData.features.filter(f => tableSelection.includes(f.id));
        }

        const filename = filters?.type ? `${filters.type.replace(/\s+/g, '_')}_data.csv` : 'exported_data.csv';
        await exportToCSV(featuresToExport, filename);
    }, [attributeData, tableSelection, filters?.type]);

    const hideTableForLayers = ['Aquifer', 'Recharge Structure'].includes(filters?.type);
    const hideSidebarForLayers = filters?.type === 'Water Resources';

    const handleLocationClick = useCallback((latlng, data) => {
        setClickedLocation(latlng);

        // Standardize data: markers often pass [record] instead of record
        const rawItem = (Array.isArray(data) && data.length > 0) ? data[0] : (Array.isArray(data) ? null : data);

        if (!rawItem) {
            setNeighbors([]);
            return;
        }

        // Resolve slim map markers to full historical records if available
        let resolvedItem = rawItem;
        const type = filters?.type;

        if (type === 'Well Inventory' && aquiferRecords?.length > 0) {
            const fullRecord = aquiferRecords.find(r =>
                (r.id && r.id === rawItem.id) ||
                (r.well_id && r.well_id === rawItem.well_id) ||
                (r.well_id && r.well_id === rawItem.id) // Fallback for components that set id=well_id
            );
            if (fullRecord) {
                resolvedItem = { ...fullRecord, type: 'well_inventory_well' };
            }
        } else if (type === 'Water Quality' && waterQualityRecords?.length > 0) {
            const fullRecord = waterQualityRecords.find(r =>
                (r.id && r.id === rawItem.id) ||
                (r.well_id && r.well_id === rawItem.well_id)
            );
            if (fullRecord) {
                resolvedItem = { ...fullRecord, type: 'water_quality_well' };
            }
        }

        setNeighbors([resolvedItem]);
    }, [setClickedLocation, setNeighbors, filters?.type, aquiferRecords, waterQualityRecords]);

    // Calculate dynamic empty message for AttributeTable
    const attributeTableEmptyMessage = useMemo(() => {
        if (filters?.type === 'Water Resources') {
            const hasSubLayer = filters.showDams || filters.showCanals || filters.showWaterbodies || filters.showMicro;
            if (!hasSubLayer) return "please select any layer by clicking checkbox";
        }
        return "No features found.";
    }, [filters]);

    const [exportTrigger, setExportTrigger] = React.useState(null);

    return (
        <div className="app-container">
            <Header />


            <div className="main-layout">
                {(!activeCategory || activeCategory.uiConfig.showControlsSidebar) && (
                    <ControlsSidebar
                        onLayerChange={handleLayerChange}
                        onFiltersApply={handleFiltersApply}
                        onBasemapChange={handleBasemapChange}
                        handleExportData={onExportData}
                        currentBasemap={basemap}
                        onCoordinateSearch={handleCoordinateSearch}
                        onMapExport={() => setExportTrigger(Date.now())}
                    />
                )}

                <div className="workspace-main">
                    <div className="map-viewport">
                        <MapView
                            onLocationClick={handleLocationClick}
                            onAddToTable={handleAddToTable}
                            onFiltersApply={handleFiltersApply}
                            dynamicBoundaries={dynamicBoundaries}
                            selectedBoundary={selectedBoundary}
                            selectedLevel={selectedLevel}
                            currentLevel={currentLevel}
                            hierarchy={hierarchy}
                            rainfallPoints={rainfallPoints}
                            rainfallDataSource={rainfallDataSource}
                            rainfallStations={rainfallStations}
                            rainfallStationRecords={rainfallStationRecords}
                            selectedWellInventory={selectedWellInventory}
                            onToggleWellInventory={handleToggleWellInventory}
                            isDataAnalysisSidebarHidden={hideSidebarForLayers}
                            isLoading={boundariesLoading || rainfallLoading || waterQualityLoading || aquiferLoading || waterResourcesLoading || analysisResults.gwreLoading}
                            searchCoordinates={searchCoordinates}
                            exportTrigger={exportTrigger}
                            // Props that are still needed because MapView isn't fully context-ified yet
                            basemap={basemap}
                            filters={filters}
                            blockBoundaryData={processedBlockData}
                            rajasthanData={rajasthanData}
                            microData={microData}
                            canalData={canalData}
                            waterbodyData={waterbodyData}
                            aquiferRecords={aquiferRecords}
                            waterQualityRecords={waterQualityRecords}
                            aquiferPolygons={analysisResults.aquiferPolygons}
                        />
                    </div>

                    {!hideTableForLayers && isProceedClicked && (
                        <Suspense fallback={<div className="table-loading">Loading Table...</div>}>
                            <AttributeTable
                                data={attributeData}
                                onRemoveRow={handleRemoveRow}
                                selectedIds={tableSelection}
                                onToggleSelection={(id) => handleToggleSelection(id, attributeData)}
                                onExportData={onExportData}
                                emptyMessage={attributeTableEmptyMessage}
                                onRowClick={(feature) => {
                                    if (feature.geometry?.type === 'Point') {
                                        setClickedLocation({
                                            lat: feature.geometry.coordinates[1],
                                            lng: feature.geometry.coordinates[0]
                                        });
                                    }
                                }}
                            />
                        </Suspense>
                    )}
                </div>

                {!hideSidebarForLayers && (
                    <DataAnalysisSidebar
                        neighbors={neighbors}
                        selectedBoundary={selectedBoundary}
                        onAddToTable={handleAddToTable}
                        selectedDams={selectedDams}
                        rainfallPoints={rainfallPoints}
                        onToggleWellInventory={handleToggleWellInventory}
                        selectedWellInventory={selectedWellInventory}
                        onClearWellInventory={handleClearWellInventory}
                        onSetWellInventory={handleSetWellInventory}
                        onFiltersApply={handleFiltersApply}
                        blockData={processedBlockData}
                        rainfallStations={rainfallStations}
                        rainfallStationRecords={rainfallStationRecords}
                        rainfallDataSource={rainfallDataSource}
                        rainfallLoading={rainfallLoading}
                        waterQualityLoading={waterQualityLoading}
                        aquiferLoading={aquiferLoading}
                        rechargeLoading={waterResourcesLoading}
                        analysisResults={analysisResults}
                        dynamicBoundaries={dynamicBoundaries}
                    />
                )}
            </div>

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
