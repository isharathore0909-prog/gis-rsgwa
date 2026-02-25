import React, { useMemo, Suspense, lazy, useCallback } from 'react';

// Components
import Header from './components/Header';
import ControlsSidebar from './components/ControlsSidebar';
import DataAnalysisSidebar from './components/DataAnalysisSidebar';
import MapView from './components/Map/MapView';

// Hooks
import { useBoundaryHierarchy, useAppLogic } from './hooks';

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
        tableSelection, canalData, waterbodyData, microData, selectedWellInventory,
        aquiferRecords, waterQualityRecords, rainfallLoading, waterQualityLoading, aquiferLoading, waterResourcesLoading,
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
        currentLevel
    } = useBoundaryHierarchy(filters, rajasthanId);

    // Memoize attribute data
    const attributeData = useMemo(() =>
        getAttributeData(
            filters, processedBlockData, neighbors, rainfallPoints,
            waterQualityRecords, aquiferRecords, selectedDams,
            canalData, waterbodyData, microData,
            rainfallStations, rainfallStationRecords
        ),
        [filters, processedBlockData, neighbors, rainfallPoints, waterQualityRecords, aquiferRecords, selectedDams, canalData, waterbodyData, microData, rainfallStations, rainfallStationRecords]
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
        setNeighbors(data || []);
    }, [setClickedLocation, setNeighbors]);

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
                            rainfallPoints={rainfallPoints}
                            rainfallDataSource={rainfallDataSource}
                            rainfallStations={rainfallStations}
                            rainfallStationRecords={rainfallStationRecords}
                            selectedWellInventory={selectedWellInventory}
                            onToggleWellInventory={handleToggleWellInventory}
                            isDataAnalysisSidebarHidden={hideSidebarForLayers}
                            isLoading={boundariesLoading || rainfallLoading || waterQualityLoading || aquiferLoading || waterResourcesLoading}
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
                        rainfallLoading={rainfallLoading}
                        waterQualityLoading={waterQualityLoading}
                        aquiferLoading={aquiferLoading}
                        rechargeLoading={waterResourcesLoading}
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
