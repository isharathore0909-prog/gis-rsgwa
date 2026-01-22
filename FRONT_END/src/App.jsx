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
import { AppContextProvider } from './context/AppContext';

// Utils
import { getAttributeData } from './utils/dataProcessors';
import { exportToCSV } from './utils/exportUtils';

// Lazy load heavy components
const AttributeTable = lazy(() => import('./components/AttributeTable'));

function App() {
    const {
        layers, setLayers, filters, setFilters, basemap, setBasemap,
        clickedLocation, setClickedLocation, neighbors, setNeighbors,
        activeUrlLayers, processedBlockData, rajasthanData, activeCategory,
        isProceedClicked, isControlsSidebarCollapsed, setIsControlsSidebarCollapsed,
        rainfallPoints, selectedDams, tableSelection, rajasthanId,
        canalData, waterbodyData, microData, selectedWellInventory,
        aquiferRecords, waterQualityRecords, rainfallLoading, waterResourcesLoading,
        handleLayerChange, handleFiltersApply, handleBasemapChange, handleAddToTable,
        handleRemoveRow, handleToggleSelection, handleToggleWellInventory, handleClearWellInventory,
        handleSetWellInventory, handleCoordinateSearch, searchCoordinates
    } = useAppLogic();

    // Use hierarchical boundary hook
    const {
        boundaries: dynamicBoundaries,
        loading: boundariesLoading,
        error: boundariesError,
        currentLevel
    } = useBoundaryHierarchy(filters, rajasthanId);

    // Memoize attribute data to avoid re-calculating on every render
    const attributeData = useMemo(() =>
        getAttributeData(
            filters, processedBlockData, neighbors, rainfallPoints,
            waterQualityRecords, aquiferRecords, selectedDams,
            canalData, waterbodyData, microData
        ),
        [filters, processedBlockData, neighbors, rainfallPoints, waterQualityRecords, aquiferRecords, selectedDams, canalData, waterbodyData, microData]
    );

    const onExportData = useCallback(async () => {
        if (!attributeData || !attributeData.features || attributeData.features.length === 0) {
            alert("No data available to export.");
            return;
        }

        let featuresToExport = attributeData.features;
        if (tableSelection && tableSelection.length > 0) {
            featuresToExport = attributeData.features.filter(f => tableSelection.includes(f.id));
        }

        const filename = filters?.type ? `${filters.type.replace(/\s+/g, '_')}_data.csv` : 'exported_data.csv';
        await exportToCSV(featuresToExport, filename);
    }, [attributeData, tableSelection, filters?.type]);

    const hideTableForLayers = ['Aquifer', 'Recharge Structure'].includes(filters?.type);
    const hideSidebarForLayers = filters?.type === 'Water Resources';

    // Calculate empty table message
    const emptyMessage = useMemo(() => {
        if (filters?.type === 'Water Resources') {
            if (!filters.showDams && !filters.showCanals && !filters.showWaterbodies && !filters.showMicro) {
                return "Select from checkboxes in the sidebar to view data.";
            }
        }
        return "No features found.";
    }, [filters]);

    const handleLocationClick = useCallback((latlng, data) => {
        setClickedLocation(latlng);
        setNeighbors(data || []);
    }, []);

    const [exportTrigger, setExportTrigger] = React.useState(null);

    return (
        <AppContextProvider>
            <div className="app-container">
                <Header />
                {(boundariesLoading || rainfallLoading || waterResourcesLoading) && (
                    <div className="global-loader-overlay">
                        <div className="loader-content">
                            <div className="spinner"></div>
                            <p>{boundariesLoading ? "Fetching boundary data..." : "Loading data..."}</p>
                        </div>
                    </div>
                )}

                <div className="main-layout">
                    {(!activeCategory || activeCategory.uiConfig.showControlsSidebar) && (
                        <ControlsSidebar
                            layers={layers}
                            onLayerChange={handleLayerChange}
                            onFiltersApply={handleFiltersApply}
                            onBasemapChange={handleBasemapChange}
                            handleExportData={onExportData}
                            currentBasemap={basemap}
                            blockBoundaryData={processedBlockData}
                            isCollapsed={isControlsSidebarCollapsed}
                            setIsCollapsed={setIsControlsSidebarCollapsed}
                            onCoordinateSearch={handleCoordinateSearch}
                            onMapExport={() => setExportTrigger(Date.now())}
                        />
                    )}

                    <div className="workspace-main">
                        <div className="map-viewport">
                            <MapView
                                layers={layers}
                                basemap={basemap}
                                onLocationClick={handleLocationClick}
                                filters={filters}
                                blockBoundaryData={processedBlockData}
                                rajasthanData={rajasthanData}
                                dynamicBoundaries={dynamicBoundaries}
                                currentLevel={currentLevel}
                                rainfallPoints={rainfallPoints}
                                onAddToTable={handleAddToTable}
                                onFiltersApply={handleFiltersApply}
                                microData={microData}
                                selectedWellInventory={selectedWellInventory}
                                onToggleWellInventory={handleToggleWellInventory}
                                isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                                isDataAnalysisSidebarHidden={hideSidebarForLayers}
                                isLoading={rainfallLoading}
                                searchCoordinates={searchCoordinates}
                                exportTrigger={exportTrigger}
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
                                    emptyMessage={emptyMessage}
                                    onRowClick={(feature) => {
                                        if (feature.geometry && feature.geometry.type === 'Point') {
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
                            layers={layers}
                            filters={filters}
                            neighbors={neighbors}
                            clickedLocation={clickedLocation}
                            onAddToTable={handleAddToTable}
                            selectedDams={selectedDams}
                            rainfallPoints={rainfallPoints}
                            onToggleWellInventory={handleToggleWellInventory}
                            selectedWellInventory={selectedWellInventory}
                            onClearWellInventory={handleClearWellInventory}
                            onSetWellInventory={handleSetWellInventory}
                            onFiltersApply={handleFiltersApply}
                            blockData={processedBlockData}
                            isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                        />
                    )}
                </div>
            </div>
        </AppContextProvider>
    );
}

export default App;
