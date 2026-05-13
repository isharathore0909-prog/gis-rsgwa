import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';
import { toTitleCase } from '../../utils/namingUtils';
import { extractApiResults } from '../../utils/apiUtils';

// Global cache to persist across component mounts
const locationCache = {
    districts: null,
    blocks: {}, // keyed by districtId or districtName
    gps: {},    // keyed by blockId or blockName
    villages: {} // keyed by gpId or blockId
};

/**
 * Custom hook to manage location data fetching and hierarchy with global caching.
 */
export const useLocations = (currentFilters) => {
    const [apiDistricts, setApiDistricts] = useState(locationCache.districts || []);
    const [apiBlocks, setApiBlocks] = useState([]);
    const [apiGPs, setApiGPs] = useState([]);
    const [apiVillages, setApiVillages] = useState([]);
    const [loading, setLoading] = useState(false);
    const activeFetches = useRef(0);

    const setGlobalLoading = (val) => {
        if (val) activeFetches.current++;
        else activeFetches.current = Math.max(0, activeFetches.current - 1);
        setLoading(activeFetches.current > 0);
    };

    const [retryCount, setRetryCount] = useState(0);

    // Initial fetch of districts
    useEffect(() => {
        let active = true;
        const fetchDistricts = async () => {
            // Check cache first
            if (locationCache.districts) {
                if (apiDistricts.length === 0) setApiDistricts(locationCache.districts);
                return;
            }

            setGlobalLoading(true);
            try {
                const res = await api.location.getDistricts({
                    state_name: 'Rajasthan',
                    limit: 100
                });

                if (!active) return;

                const districts = extractApiResults(res);
                if (districts.length > 0) {
                    locationCache.districts = districts;
                    setApiDistricts(districts);
                } else {
                    throw new Error("Empty district results");
                }
            } catch (error) {
                console.error("❌ useLocations: Error fetching districts:", error);
                if (active && !locationCache.districts) {
                    setTimeout(() => {
                        if (active) setRetryCount(c => c + 1);
                    }, 5000 + (Math.random() * 2000));
                }
            } finally {
                if (active) setGlobalLoading(false);
            }
        };
        fetchDistricts();
        return () => { active = false; };
    }, [retryCount, apiDistricts.length]);

    // Fetch blocks when district changes
    useEffect(() => {
        let active = true;
        const fetchBlocks = async () => {
            if (!currentFilters?.district) {
                setApiBlocks([]);
                return;
            }

            const cacheKey = currentFilters.districtId || currentFilters.district;
            if (locationCache.blocks[cacheKey]) {
                setApiBlocks(locationCache.blocks[cacheKey]);
                return;
            }

            setGlobalLoading(true);
            try {
                const params = { limit: 300 };
                if (currentFilters.districtId) params.district = currentFilters.districtId;
                else params.district_name = currentFilters.district;

                const res = await api.location.getBlocks(params);
                if (active) {
                    const results = extractApiResults(res);
                    locationCache.blocks[cacheKey] = results;
                    setApiBlocks(results);
                }
            } catch (error) {
                console.error(`❌ useLocations: Error fetching blocks for "${currentFilters.district}":`, error);
                if (active) setApiBlocks([]);
            } finally {
                if (active) setGlobalLoading(false);
            }
        };
        fetchBlocks();
        return () => { active = false; };
    }, [currentFilters?.district, currentFilters?.districtId]);

    // Fetch GPs when block changes
    useEffect(() => {
        let active = true;
        const fetchGPs = async () => {
            if (!currentFilters?.block) {
                setApiGPs([]);
                return;
            }

            const cacheKey = currentFilters.blockId || currentFilters.block;
            if (locationCache.gps[cacheKey]) {
                setApiGPs(locationCache.gps[cacheKey]);
                return;
            }

            setGlobalLoading(true);
            try {
                const params = { limit: 800 };
                if (currentFilters.blockId) params.block = currentFilters.blockId;
                else params.block_name = currentFilters.block;

                const res = await api.location.getGrampanchayats(params);
                if (active) {
                    const results = extractApiResults(res);
                    locationCache.gps[cacheKey] = results;
                    setApiGPs(results);
                }
            } catch (error) {
                console.error(`❌ useLocations: Error fetching GPs for "${currentFilters.block}":`, error);
                if (active) setApiGPs([]);
            } finally {
                if (active) setGlobalLoading(false);
            }
        };
        fetchGPs();
        return () => { active = false; };
    }, [currentFilters?.block, currentFilters?.blockId]);

    // Fetch Villages when GP or Block changes
    useEffect(() => {
        let active = true;
        const fetchVillages = async () => {
            if (!currentFilters?.block) {
                setApiVillages([]);
                return;
            }

            const cacheKey = currentFilters.gpId || currentFilters.gramPanchayat || currentFilters.blockId || currentFilters.block;
            if (locationCache.villages[cacheKey]) {
                setApiVillages(locationCache.villages[cacheKey]);
                return;
            }

            setGlobalLoading(true);
            try {
                const params = { limit: 1500 };
                if (currentFilters.gpId) params.gp = currentFilters.gpId;
                else if (currentFilters.gramPanchayat) params.gp_name = currentFilters.gramPanchayat;
                else if (currentFilters.blockId) params.block = currentFilters.blockId;
                else params.block_name = currentFilters.block;

                const res = await api.location.getVillages(params);
                if (active) {
                    const results = extractApiResults(res);
                    locationCache.villages[cacheKey] = results;
                    setApiVillages(results);
                }
            } catch (error) {
                console.error("❌ useLocations: Error fetching villages:", error);
                if (active) setApiVillages([]);
            } finally {
                if (active) setGlobalLoading(false);
            }
        };
        fetchVillages();
        return () => { active = false; };
    }, [currentFilters?.gramPanchayat, currentFilters?.gpId, currentFilters?.block, currentFilters?.blockId]);

    // Memos for dropdown options - Use more efficient sorting and normalization
    const availableDistricts = useMemo(() => {
        if (!apiDistricts.length) return [];
        const names = apiDistricts.map(d => {
            const val = typeof d === 'string' ? d : (d?.name || d?.district_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return Array.from(new Set(names)).sort();
    }, [apiDistricts]);

    const availableBlocks = useMemo(() => {
        if (!apiBlocks.length) return [];
        const names = apiBlocks.map(b => {
            const val = typeof b === 'string' ? b : (b?.name || b?.block_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return Array.from(new Set(names)).sort();
    }, [apiBlocks]);

    const availableGPs = useMemo(() => {
        if (!apiGPs.length) return [];
        const names = apiGPs.map(g => {
            const val = typeof g === 'string' ? g : (g?.name || g?.gp_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return Array.from(new Set(names)).sort();
    }, [apiGPs]);

    const availableVillages = useMemo(() => {
        if (!apiVillages.length) return [];
        const names = apiVillages.map(v => {
            const val = typeof v === 'string' ? v : (v?.name || v?.village_name || v?.vlg_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return Array.from(new Set(names)).sort();
    }, [apiVillages]);

    return {
        availableDistricts,
        availableBlocks,
        availableGPs,
        availableVillages,
        apiDistricts,
        apiBlocks,
        apiGPs,
        apiVillages,
        loading
    };
};

export default useLocations;

