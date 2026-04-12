import { useState, useEffect, useRef } from 'react';
import api from '../../api';
import { reprojectGeoJSON } from '../../utils/reproject';

/**
 * Handles all core application data fetching (Map Base, Rainfall, Overlays)
 */
export const useDataLoading = (filters, neighbors) => {
    const [processedBlockData, setProcessedBlockData] = useState(null);
    const [rajasthanData, setRajasthanData] = useState(null);
    const [rajasthanId, setRajasthanId] = useState(null);

    // Rainfall Specific
    const [rainfallPoints, setRainfallPoints] = useState([]);
    const [rainfallDataSource, setRainfallDataSource] = useState('station');
    const [rainfallStations, setRainfallStations] = useState([]);
    const [rainfallStationRecords, setRainfallStationRecords] = useState([]);

    // Feature Records
    const [aquiferRecords, setAquiferRecords] = useState([]);
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);

    // Secondary Overlays
    const [canalData, setCanalData] = useState(null);
    const [waterbodyData, setWaterbodyData] = useState(null);
    const [microData, setMicroData] = useState(null);

    // Loading States
    const [rainfallLoading, setRainfallLoading] = useState(false);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const [aquiferLoading, setAquiferLoading] = useState(false);
    const [waterResourcesLoading, setWaterResourcesLoading] = useState(false);
    const [initRetry, setInitRetry] = useState(0);

    const originalStaticBlockDataRef = useRef(null);

    const toTitleCase = (str) => {
        if (!str) return str;
        return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Initial Map Base
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
                if (!ignore && !rajasthanId) {
                    const nextWait = Math.min(Math.pow(2, initRetry) * 2000, 30000);
                    setTimeout(() => {
                        if (!ignore) setInitRetry(prev => prev + 1);
                    }, nextWait);
                }
            }
        };

        initializeMapBase();

        // Initial fetch for micro-data (if needed) or other small static assets
        fetchCached('/block_boundary_updated.json').then(data => {
            if (!ignore) {
                const reprojected = data._reprojected || reprojectGeoJSON(data);
                originalStaticBlockDataRef.current = reprojected || data;
                setProcessedBlockData(reprojected || data);
            }
        }).catch(err => console.warn("Failed to load initial block boundaries:", err));

        return () => { ignore = true; };
    }, [initRetry]);

    // Note: fetchRainfall (village-level) removed as per requirement to use Station data exclusively.

    // Station Rainfall
    const lastFetchedDistrict = useRef(null);
    useEffect(() => {
        let ignore = false;
        const isRelevant = ['Rainfall', 'Well Inventory'].includes(filters?.type);

        const fetchStationRainfall = async () => {
            // Only trigger global loading if we don't have stations yet
            const shouldLoad = rainfallStations.length === 0;
            if (shouldLoad) setRainfallLoading(true);

            try {
                const params = { limit: 10000 };
                if (filters?.district) {
                    if (lastFetchedDistrict.current === filters.district) {
                        if (!ignore && shouldLoad) setRainfallLoading(false);
                        return;
                    }
                    params.district = toTitleCase(filters.district);
                    lastFetchedDistrict.current = filters.district;
                }

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
                if (!ignore && shouldLoad) setRainfallLoading(false);
            }
        };

        const safetyTimeout = setTimeout(() => {
            if (!ignore) setRainfallLoading(false);
        }, 15000);

        if (isRelevant) {
            fetchStationRainfall();
        } else {
            // Already handled above, but ensure it's false
            setRainfallLoading(false);
            lastFetchedDistrict.current = null;
        }
        return () => {
            ignore = true;
            clearTimeout(safetyTimeout);
        };
    }, [filters?.type, filters?.district]);

    // Water Quality Data Fetching
    useEffect(() => {
        let ignore = false;
        if (filters?.type !== 'Water Quality') {
            setWaterQualityRecords([]);
            setWaterQualityLoading(false);
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

                // Add detailed flag to ensure we get all parameters for the table
                params.detailed = 'true';

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
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, neighbors]);

    // Aquifer Data Fetching
    useEffect(() => {
        let ignore = false;
        if (filters?.type !== 'Well Inventory' && filters?.type !== 'Aquifer') {
            setAquiferRecords([]);
            setAquiferLoading(false);
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
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    // Secondary Data Fetching (Canals, etc)
    useEffect(() => {
        if (filters?.type === 'Water Resources') {
            const fetches = [];
            // fetching for canals and waterbodies is now handled by useMapDataFetch via backend API
            if (filters.showMicro && !microData) {
                fetches.push(fetch('/micro.json').then(res => res.json()).then(data => setMicroData(data || { features: [] })).catch(() => setMicroData({ features: [] })));
            }
            if (fetches.length > 0) {

                setWaterResourcesLoading(true);
                Promise.all(fetches).finally(() => setWaterResourcesLoading(false));
            } else {
                setWaterResourcesLoading(false);
            }
        } else {
            setWaterResourcesLoading(false);
        }
    }, [filters?.type, filters?.showCanals, filters?.showWaterbodies, filters?.showMicro, canalData, waterbodyData, microData]);

    // High Precision Blocks Fetching
    useEffect(() => {
        if (!filters?.district || !rajasthanId || filters?.type === 'Ground Water Resource Estimation') {
            if (originalStaticBlockDataRef.current) setProcessedBlockData(originalStaticBlockDataRef.current);
            return;
        }

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
            } catch (err) {
                console.warn("Failed to enrichment blocks:", err);
            }
        };
        fetchHighPrecisionBlocks();
        return () => { ignore = true; };
    }, [filters?.district, filters?.type, rajasthanId]);

    return {
        processedBlockData, setProcessedBlockData,
        rajasthanData, setRajasthanData,
        rajasthanId, setRajasthanId,
        rainfallPoints, setRainfallPoints,
        rainfallDataSource, setRainfallDataSource,
        rainfallStations, setRainfallStations,
        rainfallStationRecords, setRainfallStationRecords,
        aquiferRecords, setAquiferRecords,
        waterQualityRecords, setWaterQualityRecords,
        canalData, setCanalData,
        waterbodyData, setWaterbodyData,
        microData, setMicroData,
        rainfallLoading, setRainfallLoading,
        waterQualityLoading, setWaterQualityLoading,
        aquiferLoading, setAquiferLoading,
        waterResourcesLoading, setWaterResourcesLoading
    };
};
