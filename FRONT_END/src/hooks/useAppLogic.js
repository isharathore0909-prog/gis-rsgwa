import { useState, useEffect, useCallback, useMemo } from 'react';
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
    const [rainfallLoading, setRainfallLoading] = useState(false);
    const [waterResourcesLoading, setWaterResourcesLoading] = useState(false);
    const [searchCoordinates, setSearchCoordinates] = useState(null);

    // Handlers
    const handleCoordinateSearch = useCallback((lat, lng) => {
        if (lat && lng) {
            setSearchCoordinates({ lat, lng, timestamp: Date.now() });
        }
    }, []);
    const handleLayerChange = useCallback((layerName, checked) => {
        setLayers(prev => ({ ...prev, [layerName]: checked }));
    }, []);

    const handleFiltersApply = useCallback((appliedFilters) => {
        if (appliedFilters?.type === 'Rainfall') {
            setRainfallLoading(true);
        }
        setFilters(appliedFilters);
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

    const handleSetWellInventory = useCallback((well) => {
        if (!well) return;
        setSelectedWellInventory([well]);
    }, []);

    // Initial Data Fetching
    const staticCache = useMemo(() => ({}), []); // or use module level variable if outside component

    useEffect(() => {
        let ignore = false;

        // Helper to fetch with simple caching logic
        const fetchCached = async (url) => {
            if (window._staticCache && window._staticCache[url]) {
                return window._staticCache[url];
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (!window._staticCache) window._staticCache = {};
            window._staticCache[url] = data;
            return data;
        };

        fetchCached('/Final_Dist_Boundary.geojson')
            .then(data => { if (!ignore) setRajasthanData(data); })
            .catch(err => console.error('Error loading Rajasthan boundary:', err));

        api.location.getStates({ name: 'Rajasthan' })
            .then(res => {
                if (!ignore) {
                    const states = res.results || res;
                    if (states && states.length > 0) setRajasthanId(states[0].id);
                }
            })
            .catch(err => console.error("Error fetching state ID:", err));

        fetchCached('/groundwater_zone.json')
            .then(data => {
                console.log('Successfully loaded groundwater_zone.json');
                if (!ignore) {
                    // Check if we have a cached reprojected version
                    if (data._reprojected) {
                        setProcessedBlockData(data._reprojected);
                        return;
                    }

                    const reprojected = reprojectGeoJSON(data);
                    if (reprojected) {
                        console.log('Reprojected block data success');
                        // Cache the reprojected version too to save CPU
                        data._reprojected = reprojected;
                        setProcessedBlockData(reprojected);
                    } else {
                        console.warn('Reprojection failed for groundwater_zone.json. Using raw data for stats (Map may not render blocks).');
                        setProcessedBlockData(data);
                    }
                }
            })
            .catch(err => {
                console.warn('Failed to load groundwater_zone.json, falling back:', err);
                fetchCached('/block_boundary_updated.json')
                    .then(data => {
                        console.log('Loaded fallback block_boundary_updated.json');
                        if (!ignore) {
                            if (data._reprojected) {
                                setProcessedBlockData(data._reprojected);
                                return;
                            }
                            const reprojected = reprojectGeoJSON(data);
                            if (reprojected) data._reprojected = reprojected;
                            setProcessedBlockData(reprojected || data);
                        }
                    })
                    .catch(err2 => console.error("Could not load block data (fallback failed):", err2));
            });

        return () => { ignore = true; };
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
    const toTitleCase = (str) => {
        if (!str) return str;
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    useEffect(() => {
        let ignore = false;
        const fetchRainfall = async () => {
            if (filters?.type === 'Rainfall') {
                setRainfallLoading(true);
                try {
                    const params = { limit: 5000 };
                    if (filters.district) params.district = toTitleCase(filters.district);
                    if (filters.block) params.block = toTitleCase(filters.block);
                    if (filters.gramPanchayat) params.gram_panchayat = filters.gramPanchayat;
                    if (filters.village) params.village = filters.village;
                    if (filters.dataRangeStart) params.start_date = filters.dataRangeStart;
                    if (filters.dataRangeEnd) params.end_date = filters.dataRangeEnd;

                    console.log('Fetching rainfall records with params:', params);
                    const response = await api.rainfall.getRecords(params);
                    const records = response.results || response || [];
                    console.log(`Fetched ${records.length} rainfall records`);
                    if (!ignore) {
                        setRainfallPoints(records);
                        setRainfallLoading(false);
                    }
                } catch (err) {
                    if (!ignore) {
                        console.error("Error fetching rainfall data:", err);
                        setRainfallPoints([]);
                        setRainfallLoading(false);
                    }
                }
            } else {
                if (!ignore) {
                    setRainfallPoints([]);
                    setRainfallLoading(false);
                }
            }
        };
        fetchRainfall();
        return () => { ignore = true; };
    }, [filters]);

    // Aquifer Data Fetching
    useEffect(() => {
        let ignore = false;
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
                if (!ignore) setAquiferRecords(data.results || data || []);
            } catch (err) {
                if (!ignore) {
                    console.error('Error fetching aquifer records:', err);
                    setAquiferRecords([]);
                }
            }
        };
        fetchAquifer();
        return () => { ignore = true; };
    }, [filters]);

    // Water Quality Data Fetching
    useEffect(() => {
        let ignore = false;
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
                    grampanchayat: filters.gramPanchayat || neighbor?.grampanchayat || neighbor?.properties?.grampanchayat,
                    village_name: filters.village || neighbor?.village || neighbor?.properties?.village
                };
                const response = await api.waterQuality.getRecords(params);
                if (!ignore) setWaterQualityRecords(response.results || response || []);
            } catch (err) {
                if (!ignore) {
                    console.error('Error fetching water quality records:', err);
                    setWaterQualityRecords([]);
                }
            }
        };
        fetchWQ();
        return () => { ignore = true; };
    }, [filters, neighbors]);


    // ... (existing code skipped)

    // Secondary Data Fetching (Canals, etc)
    useEffect(() => {
        if (filters?.type === 'Water Resources') {
            const fetches = [];

            if (filters.showCanals && !canalData) {
                fetches.push(
                    fetch('/data/canals_opt.json')
                        .then(res => res.json())
                        .then(data => {
                            // Ensure valid GeoJSON structure or array
                            const validData = data && (data.features || Array.isArray(data)) ? data : { type: "FeatureCollection", features: [] };
                            setCanalData(validData);
                        })
                        .catch(err => {
                            console.error("Failed to load canals:", err);
                            setCanalData({ type: "FeatureCollection", features: [] });
                        })
                );
            }

            if (filters.showWaterbodies && !waterbodyData) {
                fetches.push(
                    fetch('/data/waterbodies_opt.json')
                        .then(res => res.json())
                        .then(data => {
                            const validData = data && (data.features || Array.isArray(data)) ? data : { type: "FeatureCollection", features: [] };
                            setWaterbodyData(validData);
                        })
                        .catch(err => {
                            console.error("Failed to load waterbodies:", err);
                            setWaterbodyData({ type: "FeatureCollection", features: [] });
                        })
                );
            }

            if (filters.showMicro && !microData) {
                fetches.push(
                    fetch('/micro.json')
                        .then(res => res.json())
                        .then(data => {
                            const validData = data && (data.features || Array.isArray(data)) ? data : { type: "FeatureCollection", features: [] };
                            setMicroData(validData);
                        })
                        .catch(err => {
                            console.error("Failed to load micro structures:", err);
                            setMicroData({ type: "FeatureCollection", features: [] });
                        })
                );
            }

            if (fetches.length > 0) {
                setWaterResourcesLoading(true);
                Promise.all(fetches).finally(() => setWaterResourcesLoading(false));
            }
        }
    }, [filters, canalData, waterbodyData, microData]);

    useEffect(() => {
        setClickedLocation(null);
        setNeighbors([]);
        setTableSelection([]);
        setSelectedWellInventory([]);
        setSelectedWell(null);
    }, [filters?.type]);

    return {
        layers, setLayers, selectedWell, setSelectedWell, filters, setFilters, basemap, setBasemap,
        clickedLocation, setClickedLocation, neighbors, setNeighbors, activeUrlLayers,
        processedBlockData, rajasthanData, activeCategory, isProceedClicked,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed, rainfallPoints,
        selectedDams, tableSelection, rajasthanId, canalData, waterbodyData, microData,
        selectedWellInventory, aquiferRecords, waterQualityRecords, rainfallLoading, waterResourcesLoading,
        handleLayerChange, handleFiltersApply, handleBasemapChange, handleAddToTable,
        handleRemoveRow, handleToggleSelection, handleToggleWellInventory, handleClearWellInventory,
        handleSetWellInventory, handleCoordinateSearch, searchCoordinates
    };
};
