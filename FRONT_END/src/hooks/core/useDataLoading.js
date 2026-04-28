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
    const [rechargeRecords, setRechargeRecords] = useState([]);

    // Loading States
    const [rainfallLoading, setRainfallLoading] = useState(false);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const [aquiferLoading, setAquiferLoading] = useState(false);
    const [waterResourcesLoading, setWaterResourcesLoading] = useState(false);
    const [rechargeLoading, setRechargeLoading] = useState(false);
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
        const isRelevant = ['Rainfall', 'Well Inventory'].includes(filters?.type) || rainfallStations.length === 0;

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

        fetchStationRainfall();
        return () => {
            ignore = true;
            clearTimeout(safetyTimeout);
        };
    }, [filters?.type, filters?.district]);

    // Water Quality Data Fetching
    useEffect(() => {
        let ignore = false;
        const fetchWQ = async () => {
            setWaterQualityLoading(true);
            const timeoutId = setTimeout(() => {
                if (!ignore) setWaterQualityLoading(false);
            }, 15000);

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
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchWQ();
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, neighbors]);

    // Aquifer Data Fetching
    useEffect(() => {
        let ignore = false;
        const fetchAquifer = async () => {
            // Optimization: Don't fetch the entire state's database wells at once.
            // Wait for a district selection to show markers. Polygons are handled via WMS.
            if (!filters.district && filters.type === 'Aquifer') {
                setAquiferRecords([]);
                setAquiferLoading(false);
                return;
            }

            setAquiferLoading(true);
            const timeoutId = setTimeout(() => {
                if (!ignore) setAquiferLoading(false);
            }, 15000);

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
                    detailed: filters.district ? 'true' : 'false',
                    map_markers: !filters.district ? 'true' : undefined
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
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchAquifer();
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    // Recharge Structure Data Fetching
    useEffect(() => {
        let ignore = false;
        const fetchRecharge = async () => {
            setRechargeLoading(true);
            const timeoutId = setTimeout(() => {
                if (!ignore) setRechargeLoading(false);
            }, 15000);

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
                const data = await api.rechargeStructure.getRecords(params);
                if (!ignore) {
                    setRechargeRecords(data.results || data || []);
                    setRechargeLoading(false);
                }
            } catch (err) {
                if (!ignore) {
                    setRechargeRecords([]);
                    setRechargeLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };
        fetchRecharge();
        return () => { ignore = true; };
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);

    // Secondary Data Fetching (Canals, etc)
    useEffect(() => {
        if (filters?.type === 'Water Resources') {
            const fetches = [];
            // fetching for canals and waterbodies is now handled by useMapDataFetch via backend API
            if (!microData) {
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

    // High Precision Blocks Fetching Removed: WMS now provides high precision rendering.
    // The static base boundary is sufficient for local filtering and legend counts.
    useEffect(() => {
        if (!filters?.district || !rajasthanId) {
            if (originalStaticBlockDataRef.current) setProcessedBlockData(originalStaticBlockDataRef.current);
            return;
        }
        // In GIS mode with district selected, we keep using the static processed block data 
        // to avoid heavy GeoJSON fetch/reproject cycles. Rendering is handled by WMS.
        if (originalStaticBlockDataRef.current) {
            setProcessedBlockData(originalStaticBlockDataRef.current);
        }
    }, [filters?.district, rajasthanId]);

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
        waterResourcesLoading, setWaterResourcesLoading,
        rechargeRecords, setRechargeRecords,
        rechargeLoading, setRechargeLoading
    };
};
