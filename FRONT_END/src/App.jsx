import React, { useState, useEffect } from 'react';

// Components
import Header from './components/Header';
import ControlsSidebar from './components/ControlsSidebar';
import DataAnalysisSidebar from './components/DataAnalysisSidebar';
import MapView from './components/Map/MapView';
import AttributeTable from './components/AttributeTable';
import api from './api';

// Hooks
import { useBoundaryHierarchy } from './hooks/useBoundaryHierarchy';

// Styles
import './App.css';

// Data
import { RAJASTHAN_DAMS_DATA } from './data/damsData';

// Utils
import { reprojectGeoJSON } from './utils/reproject';
import { getPolygonCentroid } from './utils/mapUtils';

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
    const [rainfallPoints, setRainfallPoints] = useState([]);
    const [selectedDams, setSelectedDams] = useState([]);
    const [tableSelection, setTableSelection] = useState([]);
    const [rajasthanId, setRajasthanId] = useState(null);

    // Use hierarchical boundary hook
    const {
        boundaries: dynamicBoundaries,
        loading: boundariesLoading,
        error: boundariesError,
        currentLevel
    } = useBoundaryHierarchy(filters, rajasthanId);

    const handleAddToTable = (dam) => {
        setSelectedDams(prev => {
            // Generate a unique key since data lacks explicit IDs
            const damId = `${dam.name}-${dam.district}`;
            const alreadyExists = prev.some(item => item.id === damId);

            if (alreadyExists) return prev;

            const feature = {
                id: damId,
                type: 'Feature',
                properties: {
                    Name: dam.name,
                    District: dam.district,
                    Block: dam.block,
                    River: dam.river,
                    Basin: dam.basin,
                    Type: dam.type,
                    Length: dam.length ? `${dam.length}m` : 'N/A',
                    Height: dam.max_height ? `${dam.max_height}m` : 'N/A',
                    Year: dam.completion_year || 'N/A'
                }
            };
            return [...prev, feature];
        });
        // alert(`${dam.name} added to Attribute Inventory analysis.`);
    };

    const handleRemoveRow = (id) => {
        setSelectedDams(prev => prev.filter(item => item.id !== id));
        setTableSelection(prev => prev.filter(itemId => itemId !== id));
    };

    const handleToggleSelection = (id) => {
        if (id === 'all') {
            const allIds = selectedDams.map(d => d.id);
            if (tableSelection.length === allIds.length) {
                setTableSelection([]);
            } else {
                setTableSelection(allIds);
            }
        } else {
            setTableSelection(prev =>
                prev.includes(id)
                    ? prev.filter(itemId => itemId !== id)
                    : [...prev, id]
            );
        }
    };

    // Initialize Application Data
    useEffect(() => {
        // Load Rajasthan boundary from local GeoJSON file
        fetch('/Final_Dist_Boundary.geojson')
            .then(response => response.json())
            .then(data => {
                console.log('Loaded Final_Dist_Boundary.geojson:', data);
                setRajasthanData(data);
            })
            .catch(err => console.error('Error loading Final_Dist_Boundary.geojson:', err));

        // Fetch Rajasthan state ID
        api.location.getStates({ name: 'Rajasthan' })
            .then(res => {
                const states = res.results || res;
                if (states && states.length > 0) {
                    setRajasthanId(states[0].id);
                }
            })
            .catch(error => console.error("Error fetching state ID:", error));

        // Fetch blocks for legacy support (optional, can be removed if not needed elsewhere)
        // Fetch blocks - FORCE LOCAL FILE (User Request)
        // api.boundaries.getCollection({ layer: 'block' })
        //     .then(data => {
        //         if (data && data.features && data.features.length > 0) {
        //             // Start Validation: Check if features actually have valid geometry
        //             const validGeomCount = data.features.filter(f => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0).length;
        //             if (validGeomCount < data.features.length * 0.5) { // If less than 50% have valid geometry
        //                 console.warn("API returned block data with mostly missing geometries. Falling back to local file.");
        //                 throw new Error("Invalid API Data: Missing Geometries");
        //             }
        //             // End Validation

        //             const processed = reprojectGeoJSON(data);
        //             setProcessedBlockData(processed);
        //         }
        //     })
        //     .catch(() => {
        // Fallback to local file
        // Use groundwater_zone.json for Ground Water Resource Estimation
        fetch('/groundwater_zone.json')
            .then(response => response.json())
            .then(data => {
                console.log("Loaded groundwater_zone.json:", data);
                const processed = reprojectGeoJSON(data);
                setProcessedBlockData(processed);
            })
            .catch(err => {
                console.error("Could not load groundwater_zone.json, falling back to block boundary:", err);
                fetch('/block_boundary_updated.json')
                    .then(response => response.json())
                    .then(data => {
                        const processed = reprojectGeoJSON(data);
                        setProcessedBlockData(processed);
                    })
                    .catch(e => console.error("Could not load fallback block data:", e));
            });
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

    const [aquiferRecords, setAquiferRecords] = useState([]);
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);

    // Fetch rainfall points when Rainfall type is selected and date range changes
    useEffect(() => {
        const fetchRainfallData = async () => {
            if (filters?.type === 'Rainfall') {
                try {
                    const params = {};
                    if (filters.dataRangeStart) params.start_date = filters.dataRangeStart;
                    if (filters.dataRangeEnd) params.end_date = filters.dataRangeEnd;
                    if (filters.district) params.district = filters.district;
                    if (filters.block) params.block = filters.block;
                    if (filters.gramPanchayat) params.gram_panchayat = filters.gramPanchayat;
                    if (filters.village) params.village = filters.village;

                    // Fetch from Database API
                    const response = await api.rainfall.getRecords(params);
                    console.log("Rainfall data from Database:", response);

                    // Handle paginated response
                    const data = response.results || response || [];
                    setRainfallPoints(data);
                } catch (error) {
                    console.error("Error fetching database rainfall data:", error);
                    setRainfallPoints([]);
                }
            } else {
                setRainfallPoints([]);
            }
        };
        fetchRainfallData();
    }, [filters]);

    // Fetch Aquifer/Well Inventory data
    useEffect(() => {
        if (filters?.type !== 'Well Inventory' && filters?.type !== 'Aquifer') {
            setAquiferRecords([]);
            return;
        }

        const fetchAquiferData = async () => {
            try {
                const params = {};
                if (filters?.district) params.district = filters.district;
                if (filters?.taluka || filters?.block) params.block = filters.taluka || filters.block;
                if (filters?.gramPanchayat) params.grampanchayat = filters.gramPanchayat;
                if (filters?.village) params.village_name = filters.village;

                params.detailed = 'true';

                const data = await api.aquifer.getRecords(params);
                const records = data.results || data || [];
                setAquiferRecords(records);
            } catch (error) {
                console.error('Error fetching aquifer records:', error);
                setAquiferRecords([]);
            }
        };

        fetchAquiferData();
    }, [filters]);

    // Fetch Water Quality Data
    useEffect(() => {
        if (filters?.type !== 'Water Quality') {
            setWaterQualityRecords([]);
            return;
        }

        const fetchWaterQualityData = async () => {
            try {
                const params = {};
                const neighbor = neighbors && neighbors.length > 0 ? neighbors[0] : null;

                // Determine district/block from filters OR selected neighbor
                const district = filters.district || neighbor?.district || neighbor?.properties?.district;
                const block = filters.block || filters.taluka || neighbor?.block || neighbor?.properties?.block;
                const village = filters.village || neighbor?.village || neighbor?.properties?.village;

                if (district) params.district = district;
                if (block) params.block = block;
                if (village) params.village = village;

                console.log('Fetching Water Quality Records with params:', params);

                const response = await api.waterQuality.getRecords(params);
                const records = response.results || response || [];
                setWaterQualityRecords(records);
            } catch (error) {
                console.error('Error fetching water quality records:', error);
                setWaterQualityRecords([]);
            }
        };

        fetchWaterQualityData();
    }, [filters, neighbors]);

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
            let features = processedBlockData?.features || [];
            if (filters.district) {
                features = features.filter(f => (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === filters.district.toUpperCase());
            }
            if (filters.taluka || filters.block) {
                const targetBlock = (filters.taluka || filters.block).toUpperCase();
                features = features.filter(f => (f.properties.BLOCK_NAME || f.properties.Block)?.toUpperCase() === targetBlock);
            }
            return { ...processedBlockData, features };
        }

        if (filters.type === 'Ground Water Level') {
            // Even if groundwaterData is currently empty, we prepare the structure
            return {
                type: 'FeatureCollection',
                features: (neighbors.length > 0 ? neighbors : []).filter(well => {
                    const matchDist = !filters.district || well.district?.toUpperCase() === filters.district.toUpperCase();
                    const matchBlock = !(filters.taluka || filters.block) || (well.block || well.taluka)?.toUpperCase() === (filters.taluka || filters.block).toUpperCase();
                    return matchDist && matchBlock;
                }).map(well => ({
                    type: 'Feature',
                    properties: well,
                    geometry: {
                        type: 'Point',
                        coordinates: [well.lng, well.lat]
                    }
                }))
            };
        }

        if (filters.type === 'Water Resources') {
            // If user has selected specific dams (via marker click), show only those
            if (selectedDams.length > 0) {
                return {
                    type: 'FeatureCollection',
                    features: selectedDams
                };
            }

            // Otherwise show all dams matching the current filter
            // Generate dam features with coordinates derived from block centroids
            const features = RAJASTHAN_DAMS_DATA.map((dam, idx) => {
                let geometry = null;

                // Find matching block for geometry
                if (processedBlockData && processedBlockData.features) {
                    const blockFeature = processedBlockData.features.find(f => {
                        const dName = (f.properties.DIST_NAME || f.properties.District)?.toLowerCase();
                        const bName = (f.properties.BLOCK_NAME || f.properties.Block)?.toLowerCase();
                        return dName === dam.district?.toLowerCase() && bName === dam.block?.toLowerCase();
                    });

                    if (blockFeature) {
                        const centroid = getPolygonCentroid(blockFeature.geometry);
                        if (centroid) {
                            geometry = {
                                type: 'Point',
                                coordinates: [centroid.lng, centroid.lat]
                            };
                        }
                    }
                }

                // If filter is active, check if dam matches criteria
                if (filters.district && dam.district?.toLowerCase() !== filters.district.toLowerCase()) {
                    return null;
                }
                if ((filters.taluka || filters.block) && dam.block?.toLowerCase() !== (filters.taluka || filters.block).toLowerCase()) {
                    return null;
                }

                return {
                    type: 'Feature',
                    id: `dam-${idx}`,
                    properties: {
                        ...dam,
                        id: `dam-${idx}`, // Ensure ID exists for table key
                        'Dam Name': dam.name,
                        'River': dam.river,
                        'Basin': dam.basin,
                        'Capacity': dam.capacity || 'N/A'
                    },
                    geometry: geometry // Can be null if not found
                };
            }).filter(f => f !== null && f.geometry !== null); // Only return geolocated dams matching filter

            return {
                type: 'FeatureCollection',
                features: features
            };
        }

        if (filters.type === 'Rainfall') {
            // Prioritize clicked location (neighbors) if available
            if (neighbors && neighbors.length > 0) {
                return {
                    type: 'FeatureCollection',
                    features: neighbors.filter(item => {
                        const matchDist = !filters.district || item.district?.toUpperCase() === filters.district.toUpperCase();
                        const matchBlock = !(filters.taluka || filters.block) || (item.block || item.taluka)?.toUpperCase() === (filters.taluka || filters.block).toUpperCase();
                        return matchDist && matchBlock;
                    }).map((item, idx) => ({
                        type: 'Feature',
                        id: item.id || `selected-${idx}`,
                        properties: {
                            'Location': item.location || item.name || 'Selected Location',
                            'District': item.district,
                            'Block': item.block,
                            'Type': 'Selected Location',
                            ...item
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [item.lng || item.longitude || 0, item.lat || item.latitude || 0]
                        }
                    }))
                };
            }

            return {
                type: 'FeatureCollection',
                features: rainfallPoints.filter(p => {
                    const matchDist = !filters.district || p.district_name?.toUpperCase() === filters.district.toUpperCase();
                    const matchBlock = !(filters.taluka || filters.block) || (p.block_name || p.block)?.toUpperCase() === (filters.taluka || filters.block).toUpperCase();
                    return matchDist && matchBlock;
                }).map((p, idx) => ({
                    type: 'Feature',
                    id: p.id || `rain-${idx}`,
                    properties: {
                        ...p,
                        'Village Name': p.village_name || p.village,
                        'Rainfall (mm)': p.rainfall_mm,
                        'Date': p.date
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [p.longitude, p.latitude]
                    }
                }))
            };
        }

        if (filters.type === 'Water Quality') {
            const records = waterQualityRecords || [];

            return {
                type: 'FeatureCollection',
                features: records.map((p, idx) => ({
                    type: 'Feature',
                    id: p.id || `wq-${idx}`,
                    properties: {
                        'Well ID': p.well_id,
                        'District': p.district || p.village__grampanchayat__block__district__name,
                        'Block': p.block || p.village__grampanchayat__block__name,
                        'Village': p.village_name || p.village__name,
                        'pH': p.ph,
                        'TDS': p.tds,
                        'EC': p.ec,
                        'Fluoride': p.fluoride,
                        'Nitrate': p.nitrate,
                        'Iron': p.iron,
                        'Date': p.meta_date
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [p.longitude, p.latitude]
                    }
                }))
            };
        }

        if (filters.type === 'Well Inventory' || filters.type === 'Aquifer') {
            return {
                type: 'FeatureCollection',
                features: aquiferRecords.map((p, idx) => ({
                    type: 'Feature',
                    id: p.well_id || `aq-${idx}`,
                    properties: {
                        'Well ID': p.well_id,
                        // Use village_details.name as primary source, fallback to village_name or null
                        'Village': p.village_details?.name || p.village_name || '-',
                        // Fallback to filters since model properties might be unreliable
                        'District': p.district || filters.district || '-',
                        'Block': p.block || filters.block || filters.taluka || '-',
                        'Depth (m)': p.well_depth,
                        // Historical Data
                        ...[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].reduce((acc, year) => ({
                            ...acc,
                            [`Pre ${year}`]: p[`pre_${year}`] ?? '-',
                            [`Post ${year}`]: p[`pst_${year}`] ?? '-'
                        }), {})
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [p.longitude, p.latitude]
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
            {boundariesLoading && (
                <div className="global-loader-overlay">
                    <div className="loader-content">
                        <div className="spinner"></div>
                        <p>Fetching boundary data...</p>
                    </div>
                </div>
            )}

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
                            dynamicBoundaries={dynamicBoundaries}
                            currentLevel={currentLevel}
                            rainfallPoints={rainfallPoints}
                            onWellSelect={setSelectedWell}
                            selectedWell={selectedWell}
                            onLocationClick={(location, neighbors) => {
                                setClickedLocation(location);
                                setNeighbors(neighbors);
                            }}
                            onFiltersApply={handleFiltersApply} // Pass filters apply for drill-down map clicks
                            activeCategory={activeCategory}
                            initialShowLegend={isProceedClicked || activeUrlLayers.length > 0}
                            onAddToTable={handleAddToTable}
                        />
                    </div>

                    {getAttributeData() && (
                        <AttributeTable
                            data={getAttributeData()}
                            onRowClick={(feature) => {
                                console.log("Clicked feature:", feature);
                            }}
                            selectedIds={tableSelection}
                            onToggleSelection={handleToggleSelection}
                            onRemoveRow={handleRemoveRow}
                        />
                    )}
                </div>

                {(!activeCategory || activeCategory.uiConfig.showAnalysisSidebar) && !isWaterResources && (
                    <DataAnalysisSidebar
                        clickedLocation={clickedLocation}
                        neighbors={neighbors}
                        filters={filters}
                        blockData={processedBlockData}
                        rainfallPoints={rainfallPoints}
                        isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
