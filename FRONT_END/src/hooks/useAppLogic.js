import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api';
import mapLayers from '../data/mapLayers.json';
import pageCategories from '../data/pageCategories.json';
import { reprojectGeoJSON } from '../utils/reproject';
import { useAppContext } from '../context/AppContext';

export const useAppLogic = () => {
    const {
        filters, setFilters,
        layers, setLayers,
        basemap, setBasemap,
        clickedLocation, setClickedLocation,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed
    } = useAppContext();

    const [selectedWell, setSelectedWell] = useState(null);
    const [neighbors, setNeighbors] = useState([]);
    const [activeUrlLayers, setActiveUrlLayers] = useState([]);
    const [processedBlockData, setProcessedBlockData] = useState(null);
    const [rajasthanData, setRajasthanData] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [isProceedClicked, setIsProceedClicked] = useState(false);
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
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const [aquiferLoading, setAquiferLoading] = useState(false);
    const [waterResourcesLoading, setWaterResourcesLoading] = useState(false);
    const [searchCoordinates, setSearchCoordinates] = useState(null);

    // Rainfall Data Source Management
    const [rainfallDataSource, setRainfallDataSource] = useState('station');
    const [rainfallStations, setRainfallStations] = useState([]);
    const [rainfallStationRecords, setRainfallStationRecords] = useState([]);
    const [initRetry, setInitRetry] = useState(0);

    // Handlers
    const handleCoordinateSearch = useCallback((lat, lng) => {
        if (lat && lng) {
            setSearchCoordinates({ lat, lng, timestamp: Date.now() });
        }
    }, []);

    const handleLayerChange = useCallback((layerName, checked) => {
        setLayers(prev => ({ ...prev, [layerName]: checked }));
    }, [setLayers]);

    const handleFiltersApply = useCallback((appliedFilters) => {
        setFilters(appliedFilters);
        setIsProceedClicked(true);
    }, [setFilters]);

    const handleBasemapChange = useCallback((selectedBasemap) => {
        setBasemap(selectedBasemap);
    }, [setBasemap]);

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
            setTableSelection(prev => {
                const someNotSelected = id.some(itemId => !prev.includes(itemId));
                if (someNotSelected) {
                    const next = [...prev];
                    id.forEach(itemId => { if (!next.includes(itemId)) next.push(itemId); });
                    return next;
                } else {
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
                const locMatch = target.lat && target.lng && loc.lat && loc.lng &&
                    Math.abs(target.lat - loc.lat) < 0.0001 && Math.abs(target.lng - loc.lng) < 0.0001;
                return idMatch || locMatch;
            });
            if (exists) {
                return prev.filter(w => {
                    const loc = getLoc(w);
                    const idMatch = target.id && loc.id && target.id === loc.id;
                    const locMatch = target.lat && target.lng && loc.lat && loc.lng &&
                        Math.abs(target.lat - loc.lat) < 0.0001 && Math.abs(target.lng - loc.lng) < 0.0001;
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

    const originalStaticBlockDataRef = useRef(null);

    // Initial Data Fetching
    useEffect(() => {
        let ignore = false;
        const fetchCached = async (url) => {
            if (window._staticCache && window._staticCache[url]) return window._staticCache[url];
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (!window._staticCache) window._staticCache = {};
            window._staticCache[url] = data;
            return data;
        };

        const initializeMapBase = async () => {
            try {
                const localData = await fetchCached('/district.geojson');
                if (!ignore && localData) {
                    const reprojected = reprojectGeoJSON(localData);
                    setRajasthanData(reprojected || localData);
                }

                if (!rajasthanId) {
                    const states = await api.location.getStates({ name: 'Rajasthan' });
                    const stateObj = (states.results || states)?.[0];
                    if (stateObj && !ignore) setRajasthanId(stateObj.id);
                }
            } catch (err) {
                console.error('× Error initializing map base:', err);
                // Robust auto-retry on initialization failure
                if (!ignore && !rajasthanId) {
                    const nextWait = Math.min(Math.pow(2, initRetry) * 2000, 30000);
                    console.log(`⏱️ Retrying map initialization in ${nextWait / 1000}s...`);
                    setTimeout(() => {
                        if (!ignore) setInitRetry(prev => prev + 1);
                    }, nextWait);
                }
            }
        };

        initializeMapBase();

        fetchCached('/groundwater_zone.json')
            .then(data => {
                if (!ignore) {
                    const reprojected = data._reprojected || reprojectGeoJSON(data);
                    if (reprojected) {
                        data._reprojected = reprojected;
                        originalStaticBlockDataRef.current = reprojected;
                        setProcessedBlockData(reprojected);
                    } else {
                        originalStaticBlockDataRef.current = data;
                        setProcessedBlockData(data);
                    }
                }
            })
            .catch(() => {
                fetchCached('/block_boundary_updated.json').then(data => {
                    if (!ignore) {
                        const reprojected = data._reprojected || reprojectGeoJSON(data);
                        originalStaticBlockDataRef.current = reprojected || data;
                        setProcessedBlockData(reprojected || data);
                    }
                });
            });

        return () => { ignore = true; };
    }, [initRetry]);

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
                if (currentUrlLayers.some(l => l.id === 2)) {
                    setFilters(prev => ({
                        ...prev,
                        type: 'Ground Water Resource Estimation',
                        district: '',
                        block: '',
                        gramPanchayat: '',
                        village: ''
                    }));
                }
            }
        }
    }, [activeUrlLayers, setLayers, setFilters]);

    const toTitleCase = (str) => {
        if (!str) return str;
        return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Data Fetching Effects (Rainfall, Aquifer, etc.)
    useEffect(() => {
        let ignore = false;
        if (filters?.type === 'Rainfall') {
            const fetchRainfall = async () => {
                setRainfallLoading(true);
                try {
                    const params = { limit: 5000 };
                    if (filters.district_id) params.district_id = filters.district_id;
                    else if (filters.district) params.district = toTitleCase(filters.district);

                    if (filters.block_id) params.block_id = filters.block_id;
                    else if (filters.block) params.block = toTitleCase(filters.block);

                    if (filters.dataRangeStart) params.start_date = filters.dataRangeStart;
                    if (filters.dataRangeEnd) params.end_date = filters.dataRangeEnd;

                    const response = await api.rainfall.getRecords(params);
                    if (!ignore) {
                        setRainfallPoints(response.results || response || []);
                        setRainfallLoading(false);
                    }
                } catch (err) {
                    if (!ignore) {
                        setRainfallPoints([]);
                        setRainfallLoading(false);
                    }
                }
            };
            fetchRainfall();
        } else {
            setRainfallPoints([]);
        }
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.dataRangeStart, filters?.dataRangeEnd]); // Narrowed dependencies

    // Station Rainfall
    useEffect(() => {
        let ignore = false;
        const isRelevant = ['Rainfall', 'Well Inventory'].includes(filters?.type);
        if (isRelevant) {
            const fetchStationRainfall = async () => {
                setRainfallLoading(true);
                try {
                    const params = { limit: 10000 };
                    if (filters?.district) params.district = toTitleCase(filters.district);
                    const [stations, records] = await Promise.all([
                        api.rainfall.getStations(params),
                        api.rainfall.getStationRecords(params)
                    ]);
                    if (!ignore) {
                        setRainfallStations(Array.isArray(stations) ? stations : []);
                        setRainfallStationRecords(Array.isArray(records?.results) ? records.results : (Array.isArray(records) ? records : []));
                    }
                } catch (err) {
                    if (!ignore) {
                        setRainfallStations([]);
                        setRainfallStationRecords([]);
                    }
                } finally {
                    if (!ignore) setRainfallLoading(false);
                }
            };
            fetchStationRainfall();
        } else {
            setRainfallLoading(false);
        }
        return () => { ignore = true; };
    }, [filters?.type, filters?.district]); // Narrowed dependencies

    // Water Quality Data Fetching
    useEffect(() => {
        let ignore = false;
        if (filters?.type !== 'Water Quality') {
            setWaterQualityRecords([]);
            return;
        }
        const fetchWQ = async () => {
            setWaterQualityLoading(true);
            try {
                const neighbor = neighbors?.[0];
                const params = {
                    district_id: filters.district_id,
                    district: filters.district || neighbor?.district || neighbor?.properties?.district,
                    block_id: filters.block_id,
                    block: filters.block || neighbor?.block || neighbor?.properties?.block,
                    gp_id: filters.gp_id,
                    grampanchayat: filters.gramPanchayat || neighbor?.grampanchayat || neighbor?.properties?.grampanchayat,
                    village_id: filters.village_id,
                    village_name: filters.village || neighbor?.village || neighbor?.properties?.village
                };
                const response = await api.waterQuality.getRecords(params);
                if (!ignore) {
                    setWaterQualityRecords(response.results || response || []);
                    setWaterQualityLoading(false);
                }
            } catch (err) {
                if (!ignore) {
                    setWaterQualityRecords([]);
                    setWaterQualityLoading(false);
                }
            }
        };
        fetchWQ();
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, neighbors]); // Narrowed dependencies

    // Aquifer Data Fetching
    useEffect(() => {
        let ignore = false;
        if (filters?.type !== 'Well Inventory' && filters?.type !== 'Aquifer') {
            setAquiferRecords([]);
            return;
        }
        const fetchAquifer = async () => {
            setAquiferLoading(true);
            try {
                const params = {
                    district_id: filters.district_id,
                    district: filters.district,
                    block_id: filters.block_id,
                    block: filters.block,
                    gp_id: filters.gp_id,
                    grampanchayat: filters.gramPanchayat,
                    village_id: filters.village_id,
                    village_name: filters.village,
                    detailed: 'true'
                };
                const data = await api.aquifer.getRecords(params);
                if (!ignore) {
                    setAquiferRecords(data.results || data || []);
                    setAquiferLoading(false);
                }
            } catch (err) {
                if (!ignore) {
                    setAquiferRecords([]);
                    setAquiferLoading(false);
                }
            }
        };
        fetchAquifer();
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]); // Narrowed dependencies

    // Secondary Data Fetching (Canals, etc)
    useEffect(() => {
        if (filters?.type === 'Water Resources') {
            const fetches = [];
            if (filters.showCanals && !canalData) {
                fetches.push(fetch('/data/canals_opt.json').then(res => res.json()).then(data => setCanalData(data || { features: [] })).catch(() => setCanalData({ features: [] })));
            }
            if (filters.showWaterbodies && !waterbodyData) {
                fetches.push(fetch('/data/waterbodies_opt.json').then(res => res.json()).then(data => setWaterbodyData(data || { features: [] })).catch(() => setWaterbodyData({ features: [] })));
            }
            if (filters.showMicro && !microData) {
                fetches.push(fetch('/micro.json').then(res => res.json()).then(data => setMicroData(data || { features: [] })).catch(() => setMicroData({ features: [] })));
            }
            if (fetches.length > 0) {
                setWaterResourcesLoading(true);
                Promise.all(fetches).finally(() => setWaterResourcesLoading(false));
            }
        }
    }, [filters?.type, filters?.showCanals, filters?.showWaterbodies, filters?.showMicro, canalData, waterbodyData, microData]);

    // High Precision Blocks Fetching
    useEffect(() => {
        if (!filters?.district || !rajasthanId) {
            if (originalStaticBlockDataRef.current) setProcessedBlockData(originalStaticBlockDataRef.current);
            return;
        }

        // Immediately clear previous data to prevent "ghost" boundaries from the previous district 
        // showing at the wrong map coordinates during the transit.
        setProcessedBlockData(null);

        let ignore = false;
        const fetchHighPrecisionBlocks = async () => {
            try {
                const districts = await api.location.getDistricts({ name: filters.district });
                const district = districts.results?.[0] || districts[0];
                if (!district || ignore) return;
                const data = await api.boundaries.getCollection({ layer: 'block', parent_id: district.id, fetch: 'true' });
                if (data && data.features && !ignore) {
                    const mergedFeatures = data.features.map(f => {
                        const bName = (f.properties.name || f.properties.BLOCK_NAME || '').toString().toUpperCase().trim();
                        const staticMatch = originalStaticBlockDataRef.current?.features?.find(sf => {
                            const sfName = (sf.properties.BLOCK_NAME || sf.properties.Block || '').toString().toUpperCase().trim();
                            const sfDist = (sf.properties.DIST_NAME || sf.properties.District || '').toString().toUpperCase().trim();
                            return sfDist === filters.district.toUpperCase().trim() && (bName === sfName || bName.includes(sfName) || sfName.includes(bName));
                        });
                        return {
                            ...f,
                            properties: {
                                ...f.properties, ...(staticMatch?.properties || {}),
                                BLOCK_NAME: f.properties.name || f.properties.BLOCK_NAME || staticMatch?.properties.BLOCK_NAME,
                                DIST_NAME: f.properties.district_name || staticMatch?.properties.DIST_NAME || filters.district
                            }
                        };
                    });
                    const reprojected = reprojectGeoJSON({ ...data, features: mergedFeatures });
                    if (!ignore) setProcessedBlockData(reprojected);
                }
            } catch (err) { console.warn("Failed to enrichment blocks:", err); }
        };
        fetchHighPrecisionBlocks();
        return () => { ignore = true; };
    }, [filters?.district, rajasthanId]);

    // Proactive Reset on Layer Change: 
    // If the layer type changes, we MUST reset isProceedClicked so the 
    // sidebar and table don't show "ghost" data from the previous layer's selection.
    const prevTypeRef = useRef(filters?.type);
    useEffect(() => {
        if (filters?.type !== prevTypeRef.current) {
            setIsProceedClicked(false);
            setClickedLocation(null);
            setNeighbors([]);
            prevTypeRef.current = filters?.type;
        }
    }, [filters?.type, setClickedLocation]);

    // Cleanup effects on filter change
    useEffect(() => {
        setClickedLocation(null);
        setNeighbors([]);
        setTableSelection([]);
        setSelectedWellInventory([]);
        setSelectedWell(null);
    }, [
        filters?.type,
        filters?.district,
        filters?.block,
        filters?.gramPanchayat,
        filters?.village,
        setClickedLocation
    ]);

    return {
        layers, setLayers, selectedWell, setSelectedWell, filters, setFilters, basemap, setBasemap,
        clickedLocation, setClickedLocation, neighbors, setNeighbors, activeUrlLayers,
        processedBlockData, rajasthanData, activeCategory, isProceedClicked,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed, rainfallPoints,
        selectedDams, tableSelection, rajasthanId, canalData, waterbodyData, microData,
        selectedWellInventory, aquiferRecords, waterQualityRecords,
        rainfallLoading, waterQualityLoading, aquiferLoading, waterResourcesLoading,
        rainfallDataSource, setRainfallDataSource, rainfallStations, rainfallStationRecords,
        handleLayerChange, handleFiltersApply, handleBasemapChange, handleAddToTable,
        handleRemoveRow, handleToggleSelection, handleToggleWellInventory, handleClearWellInventory,
        handleSetWellInventory, handleCoordinateSearch, searchCoordinates
    };
};
