import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import mapLayers from '../data/mapLayers.json';
import pageCategories from '../data/pageCategories.json';
import { reprojectGeoJSON } from '../utils/reproject';

export const useAppLogic = () => {
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
    const [rainfallPoints, setRainfallPoints] = useState([]);
    const [selectedDams, setSelectedDams] = useState([]);
    const [tableSelection, setTableSelection] = useState([]);
    const [rajasthanId, setRajasthanId] = useState(null);
    const [canalData, setCanalData] = useState(null);
    const [waterbodyData, setWaterbodyData] = useState(null);
    const [microData, setMicroData] = useState(null);
    const [selectedWellInventory, setSelectedWellInventory] = useState([]);
    const [aquiferRecords, setAquiferRecords] = useState([]);
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);

    // Handlers
    const handleLayerChange = useCallback((layerName, checked) => {
        setLayers(prev => ({ ...prev, [layerName]: checked }));
    }, []);

    const handleFiltersApply = useCallback((appliedFilters) => {
        setFilters(prev => {
            if (prev?.type !== appliedFilters?.type) {
                setTableSelection([]);
            }
            return appliedFilters;
        });
        setIsProceedClicked(true);
    }, []);

    const handleBasemapChange = useCallback((selectedBasemap) => {
        setBasemap(selectedBasemap);
    }, []);

    const handleAddToTable = useCallback((dam) => {
        setSelectedDams(prev => {
            const damId = `${dam.name}-${dam.district}`;
            if (prev.some(item => item.id === damId)) return prev;
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
    }, []);

    const handleRemoveRow = useCallback((id) => {
        setSelectedDams(prev => prev.filter(item => item.id !== id));
        setTableSelection(prev => prev.filter(itemId => itemId !== id));
    }, []);

    const handleToggleSelection = useCallback((id, data) => {
        if (id === 'all') {
            if (!data || !data.features) return;
            const allIds = data.features.map(f => f.id);
            setTableSelection(prev => (prev.length === allIds.length && allIds.length > 0) ? [] : allIds);
        } else if (Array.isArray(id)) {
            // Bulk selection (e.g. from Select All in a tab)
            setTableSelection(prev => {
                const someNotSelected = id.some(itemId => !prev.includes(itemId));
                if (someNotSelected) {
                    // Add missing ones
                    const next = [...prev];
                    id.forEach(itemId => { if (!next.includes(itemId)) next.push(itemId); });
                    return next;
                } else {
                    // Remove these ones
                    return prev.filter(itemId => !id.includes(itemId));
                }
            });
        } else {
            setTableSelection(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
        }
    }, []);

    const handleToggleWellInventory = useCallback((well) => {
        if (!well) return;
        setSelectedWellInventory(prev => {
            const getLoc = (w) => ({
                id: w.well_id || w.id,
                lat: parseFloat(w.latitude || w.lat || 0),
                lng: parseFloat(w.longitude || w.lng || 0)
            });
            const target = getLoc(well);
            const exists = prev.find(w => {
                const loc = getLoc(w);
                const idMatch = target.id && loc.id && target.id === loc.id;
                const locMatch = Math.abs(target.lat - loc.lat) < 0.0001 && Math.abs(target.lng - loc.lng) < 0.0001;
                return idMatch || locMatch;
            });
            if (exists) {
                return prev.filter(w => {
                    const loc = getLoc(w);
                    const idMatch = target.id && loc.id && target.id === loc.id;
                    const locMatch = Math.abs(target.lat - loc.lat) < 0.0001 && Math.abs(target.lng - loc.lng) < 0.0001;
                    return !(idMatch || locMatch);
                });
            }
            return [...prev, well];
        });
    }, []);

    const handleClearWellInventory = useCallback(() => setSelectedWellInventory([]), []);

    // Initial Data Fetching
    useEffect(() => {
        fetch('/Final_Dist_Boundary.geojson')
            .then(res => res.json())
            .then(data => setRajasthanData(data))
            .catch(err => console.error('Error loading Rajasthan boundary:', err));

        api.location.getStates({ name: 'Rajasthan' })
            .then(res => {
                const states = res.results || res;
                if (states && states.length > 0) setRajasthanId(states[0].id);
            })
            .catch(err => console.error("Error fetching state ID:", err));

        fetch('/groundwater_zone.json')
            .then(res => res.json())
            .then(data => setProcessedBlockData(reprojectGeoJSON(data)))
            .catch(() => {
                fetch('/block_boundary_updated.json')
                    .then(res => res.json())
                    .then(data => setProcessedBlockData(reprojectGeoJSON(data)))
                    .catch(err => console.error("Could not load block data:", err));
            });
    }, []);

    // URL Params Handling
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        let currentUrlLayers = [];

        const layerIdsParam = searchParams.get('layer_ids');
        if (layerIdsParam) {
            const ids = layerIdsParam.split(',').map(id => parseInt(id.trim(), 10));
            const selectedLayers = mapLayers.filter(layer => ids.includes(layer.id));
            setActiveUrlLayers(selectedLayers);
            currentUrlLayers = selectedLayers;
        }

        const typeIdParam = searchParams.get('type_id');
        if (typeIdParam) {
            const category = pageCategories.find(cat => cat.type_id === typeIdParam);
            if (category) {
                setActiveCategory(category);
                if (category.uiConfig?.defaultLayers) {
                    setLayers(prev => {
                        const newLayers = { ...prev };
                        Object.keys(newLayers).forEach(key => newLayers[key] = false);
                        category.uiConfig.defaultLayers.forEach(layerKey => {
                            if (newLayers.hasOwnProperty(layerKey)) newLayers[layerKey] = true;
                        });
                        return newLayers;
                    });
                }
            }
            if (currentUrlLayers.some(l => l.id === 2)) {
                setFilters(prev => ({ ...prev, type: 'Ground Water Resource Estimation' }));
            }
        } else if (currentUrlLayers.some(l => l.id === 2)) {
            setFilters(prev => ({ ...prev, type: 'Ground Water Resource Estimation' }));
        }
    }, []);

    // Rainfall Data Fetching
    useEffect(() => {
        const fetchRainfall = async () => {
            if (filters?.type === 'Rainfall') {
                try {
                    const params = { limit: 5000, ...filters };
                    const response = await api.rainfall.getRecords(params);
                    setRainfallPoints(response.results || response || []);
                } catch (err) {
                    console.error("Error fetching rainfall data:", err);
                    setRainfallPoints([]);
                }
            } else {
                setRainfallPoints([]);
            }
        };
        fetchRainfall();
    }, [filters]);

    // Aquifer Data Fetching
    useEffect(() => {
        if (filters?.type !== 'Well Inventory' && filters?.type !== 'Aquifer') {
            setAquiferRecords([]);
            return;
        }
        const fetchAquifer = async () => {
            try {
                const params = {
                    district: filters.district,
                    block: filters.block,
                    grampanchayat: filters.gramPanchayat,
                    village_name: filters.village,
                    detailed: 'true'
                };
                const data = await api.aquifer.getRecords(params);
                setAquiferRecords(data.results || data || []);
            } catch (err) {
                console.error('Error fetching aquifer records:', err);
                setAquiferRecords([]);
            }
        };
        fetchAquifer();
    }, [filters]);

    // Water Quality Data Fetching
    useEffect(() => {
        if (filters?.type !== 'Water Quality') {
            setWaterQualityRecords([]);
            return;
        }
        const fetchWQ = async () => {
            try {
                const neighbor = neighbors?.[0];
                const params = {
                    district: filters.district || neighbor?.district || neighbor?.properties?.district,
                    block: filters.block || neighbor?.block || neighbor?.properties?.block,
                    village: filters.village || neighbor?.village || neighbor?.properties?.village
                };
                const response = await api.waterQuality.getRecords(params);
                setWaterQualityRecords(response.results || response || []);
            } catch (err) {
                console.error('Error fetching water quality records:', err);
                setWaterQualityRecords([]);
            }
        };
        fetchWQ();
    }, [filters, neighbors]);

    // Secondary Data Fetching (Canals, etc)
    useEffect(() => {
        if (filters?.type === 'Water Resources') {
            if (filters.showCanals && !canalData) {
                fetch('/data/canals_opt.json').then(res => res.json()).then(setCanalData).catch(console.error);
            }
            if (filters.showWaterbodies && !waterbodyData) {
                fetch('/data/waterbodies_opt.json').then(res => res.json()).then(setWaterbodyData).catch(console.error);
            }
            if (filters.showMicro && !microData) {
                fetch('/micro.json').then(res => res.json()).then(setMicroData).catch(console.error);
            }
        }
    }, [filters, canalData, waterbodyData, microData]);

    return {
        layers, setLayers, selectedWell, setSelectedWell, filters, setFilters, basemap, setBasemap,
        clickedLocation, setClickedLocation, neighbors, setNeighbors, activeUrlLayers,
        processedBlockData, rajasthanData, activeCategory, isProceedClicked,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed, rainfallPoints,
        selectedDams, tableSelection, rajasthanId, canalData, waterbodyData, microData,
        selectedWellInventory, aquiferRecords, waterQualityRecords,
        handleLayerChange, handleFiltersApply, handleBasemapChange, handleAddToTable,
        handleRemoveRow, handleToggleSelection, handleToggleWellInventory, handleClearWellInventory
    };
};
