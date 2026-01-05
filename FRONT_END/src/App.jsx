import React, { useState, useEffect } from 'react';

// Components
import Header from './components/Header';
import ControlsSidebar from './components/ControlsSidebar';
import DataAnalysisSidebar from './components/DataAnalysisSidebar';
import MapView from './components/MapView';
import AttributeTable from './components/AttributeTable';

// Utils & Data
import { reprojectGeoJSON } from './utils/reproject';
import mapLayers from './data/mapLayers.json';
import pageCategories from './data/pageCategories.json';

// Styles
import './App.css';

function App() {
    const [layers, setLayers] = useState({
        wells: true,
        contours: false,
        quality: false,
        satellite: false,
        blockBoundary: false
    });
    const [selectedWell, setSelectedWell] = useState(null);
    const [filters, setFilters] = useState(null);
    const [basemap, setBasemap] = useState('light-gray');
    const [clickedLocation, setClickedLocation] = useState(null);
    const [neighbors, setNeighbors] = useState([]);
    const [activeUrlLayers, setActiveUrlLayers] = useState([]);
    const [processedBlockData, setProcessedBlockData] = useState(null);
    const [rajasthanData, setRajasthanData] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [isProceedClicked, setIsProceedClicked] = useState(false);
    const [isControlsSidebarCollapsed, setIsControlsSidebarCollapsed] = useState(false);
    const [waterResourceView, setWaterResourceView] = useState('Dams');

    // Fetch and Reproject Block Data on Mount
    useEffect(() => {
        // Fetch blocks
        fetch('/block_boundary.json')
            .then(response => response.json())
            .then(data => {
                const processed = reprojectGeoJSON(data);
                setProcessedBlockData(processed);
            })
            .catch(error => console.error("Error fetching block boundary data:", error));

        // Fetch Rajasthan state boundary
        fetch('/Rajasthan.geojson')
            .then(response => response.json())
            .then(data => {
                // Assuming Rajasthan.geojson is already in WGS84 (lat/lng)
                setRajasthanData(data);
            })
            .catch(error => console.error("Error fetching Rajasthan boundary data:", error));
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        let currentUrlLayers = [];

        // Handle layer_ids
        const layerIdsParam = searchParams.get('layer_ids');
        if (layerIdsParam) {
            const ids = layerIdsParam.split(',').map(id => parseInt(id.trim(), 10));
            const selectedLayers = mapLayers.filter(layer => ids.includes(layer.id));
            setActiveUrlLayers(selectedLayers);
            currentUrlLayers = selectedLayers;
        }

        // Handle type_id for Page Categorization
        const typeIdParam = searchParams.get('type_id');
        if (typeIdParam) {
            const category = pageCategories.find(cat => cat.type_id === typeIdParam);
            if (category) {
                console.log("Page Category Set:", category);
                setActiveCategory(category);

                // Apply Default Layers from Config
                if (category.uiConfig && category.uiConfig.defaultLayers) {
                    setLayers(prev => {
                        const newLayers = { ...prev };
                        // Reset all standard layers to false first
                        Object.keys(newLayers).forEach(key => newLayers[key] = false);

                        // Enable specified default layers
                        category.uiConfig.defaultLayers.forEach(layerKey => {
                            if (newLayers.hasOwnProperty(layerKey)) {
                                newLayers[layerKey] = true;
                            }
                        });
                        return newLayers;
                    });
                }
            }

            // Auto-apply filter for Layer 2
            // This ensures Block Boundary shows automatically when layer_ids=2 is present
            const isLayer2Active = currentUrlLayers.some(l => l.id === 2);
            if (isLayer2Active) {
                console.log("Auto-applying Ground Water Resource Estimation filter for Layer 2");
                setFilters(prev => ({ ...prev, type: 'Ground Water Resource Estimation' }));
            }
        } else {
            // If no type_id, still check for Layer 2 to auto-apply filter
            const isLayer2Active = currentUrlLayers.some(l => l.id === 2);
            if (isLayer2Active) {
                console.log("Auto-applying Ground Water Resource Estimation filter (Layer 2 only)");
                setFilters(prev => ({ ...prev, type: 'Ground Water Resource Estimation' }));
            }
        }
    }, []);

    const handleLayerChange = (layerName, checked) => {
        setLayers(prev => ({
            ...prev,
            [layerName]: checked
        }));
    };

    const handleFiltersApply = (appliedFilters) => {
        setFilters(appliedFilters);
        setIsProceedClicked(true);

        if (appliedFilters.type === 'Water Resources') {
            setIsControlsSidebarCollapsed(true);
        }

        // Here you would typically filter the data based on filters
        console.log('Filters applied:', appliedFilters);
    };

    const handleBasemapChange = (selectedBasemap) => {
        setBasemap(selectedBasemap);
    };

    const getAttributeData = () => {
        if (!filters || !filters.type) return null;

        if (filters.type === 'Ground Water Resource Estimation') {
            return processedBlockData;
        }

        if (filters.type === 'Ground Water Level') {
            // Even if groundwaterData is currently empty, we prepare the structure
            return {
                type: 'FeatureCollection',
                features: (neighbors.length > 0 ? neighbors : []).map(well => ({
                    type: 'Feature',
                    properties: well,
                    geometry: {
                        type: 'Point',
                        coordinates: [well.lng, well.lat]
                    }
                }))
            };
        }

        return null;
    };

    const isWaterResources = filters?.type === 'Water Resources';

    return (
        <div className="app-container">
            <Header />

            <div className={`main-layout ${isWaterResources ? 'full-width-map' : ''}`} style={isWaterResources ? { gridTemplateColumns: '1fr' } : {}}>
                <div className="workspace-container">
                    <div className="workspace-main" style={{ position: 'relative' }}>
                        {isWaterResources && (
                            <div style={{
                                position: 'absolute',
                                top: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 1000,
                                backgroundColor: 'white',
                                padding: '4px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                display: 'flex',
                                gap: '4px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {['Dams', 'Reservoirs'].map(view => (
                                    <button
                                        key={view}
                                        onClick={() => setWaterResourceView(view)}
                                        style={{
                                            padding: '6px 16px',
                                            backgroundColor: waterResourceView === view ? '#3b82f6' : 'transparent',
                                            color: waterResourceView === view ? 'white' : '#64748b',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s',
                                            boxShadow: waterResourceView === view ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                    >
                                        {view}
                                    </button>
                                ))}
                            </div>
                        )}
                        {(!activeCategory || activeCategory.uiConfig.showControlsSidebar) && (
                            <ControlsSidebar
                                layers={layers}
                                onLayerChange={handleLayerChange}
                                onFiltersApply={handleFiltersApply}
                                onBasemapChange={handleBasemapChange}
                                currentBasemap={basemap}
                                blockBoundaryData={processedBlockData}
                                isCollapsed={isControlsSidebarCollapsed}
                                setIsCollapsed={setIsControlsSidebarCollapsed}
                            />
                        )}
                        <MapView
                            layers={layers}
                            basemap={basemap}
                            filters={filters}
                            activeUrlLayers={activeUrlLayers}
                            blockBoundaryData={processedBlockData}
                            rajasthanData={rajasthanData}
                            onWellSelect={setSelectedWell}
                            selectedWell={selectedWell}
                            onLocationClick={(location, neighbors) => {
                                setClickedLocation(location);
                                setNeighbors(neighbors);
                            }}
                            activeCategory={activeCategory}
                            initialShowLegend={isProceedClicked || activeUrlLayers.length > 0}
                        />
                    </div>

                    {getAttributeData() && (
                        <div className="workspace-bottom">
                            <AttributeTable
                                data={getAttributeData()}
                                onRowClick={(feature) => {
                                    console.log("Clicked feature:", feature);
                                }}
                            />
                        </div>
                    )}
                </div>

                {(!activeCategory || activeCategory.uiConfig.showAnalysisSidebar) && !isWaterResources && (
                    <DataAnalysisSidebar
                        clickedLocation={clickedLocation}
                        neighbors={neighbors}
                        filters={filters}
                        blockData={processedBlockData}
                        isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
