import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';

/**
 * Custom hook to manage location data fetching and hierarchy.
 */
export const useLocations = (currentFilters) => {
    const [apiDistricts, setApiDistricts] = useState([]);
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
            // Only fetch if empty
            if (apiDistricts.length > 0) return;

            console.log("📡 useLocations: Initial district fetch starting...");
            setGlobalLoading(true);
            try {
                const districtRes = await api.location.getDistricts({
                    state_name: 'Rajasthan',
                    limit: 100
                });

                if (!active) return;

                // Hyper-robust extraction of results
                let districts = [];
                const res = districtRes;
                if (Array.isArray(res)) districts = res;
                else if (res?.results && Array.isArray(res.results)) districts = res.results;
                else if (res?.data?.results && Array.isArray(res.data.results)) districts = res.data.results;
                else if (res?.data && Array.isArray(res.data)) districts = res.data;
                else if (res && typeof res === 'object') districts = Object.values(res).filter(item => typeof item === 'object');

                if (districts.length > 0) {
                    console.log(`✅ useLocations: Received ${districts.length} districts`);
                    setApiDistricts(districts);
                } else {
                    throw new Error("Empty district results");
                }
            } catch (error) {
                console.error("❌ useLocations: Error fetching districts:", error);

                // If it fails on start, we should try again after a delay
                if (active && apiDistricts.length === 0) {
                    const delay = 5000 + (Math.random() * 2000); // 5-7s jittered delay
                    console.log(`📡 useLocations: Retrying district fetch in ${Math.round(delay / 1000)}s...`);
                    setTimeout(() => {
                        if (active) setRetryCount(c => c + 1);
                    }, delay);
                }
            } finally {
                if (active) setGlobalLoading(false);
            }
        };
        fetchDistricts();
        return () => { active = false; };
    }, [apiDistricts.length, retryCount]);

    // Fetch blocks when district changes
    useEffect(() => {
        let active = true;
        const fetchBlocks = async () => {
            if (!currentFilters?.district) {
                setApiBlocks([]);
                return;
            }
            console.log(`📡 useLocations: Fetching blocks for "${currentFilters.district}"...`);
            setGlobalLoading(true);
            try {
                const params = { limit: 200 };
                if (currentFilters.district_id) {
                    params.district = currentFilters.district_id;
                } else {
                    params.district_name = currentFilters.district;
                }

                const blockRes = await api.location.getBlocks(params);
                if (!active) return;
                let blocks = [];
                const res = blockRes;
                if (Array.isArray(res)) blocks = res;
                else if (res?.results && Array.isArray(res.results)) blocks = res.results;
                else if (res?.data?.results && Array.isArray(res.data.results)) blocks = res.data.results;
                else if (res?.data && Array.isArray(res.data)) blocks = res.data;
                else if (res && typeof res === 'object') blocks = Object.values(res).filter(item => typeof item === 'object');
                console.log(`✅ useLocations: Received ${blocks.length} blocks for "${currentFilters.district}"`);
                setApiBlocks(blocks);
            } catch (error) {
                console.error(`❌ useLocations: Error fetching blocks for "${currentFilters.district}":`, error);
                if (active) setApiBlocks([]);
            } finally {
                setGlobalLoading(false);
            }
        };
        fetchBlocks();
        return () => { active = false; };
    }, [currentFilters?.district]);

    // Fetch GPs when block changes
    useEffect(() => {
        let active = true;
        const fetchGPs = async () => {
            if (!currentFilters?.block) {
                setApiGPs([]);
                return;
            }
            console.log(`📡 useLocations: Fetching GPs for "${currentFilters.block}"...`);
            setGlobalLoading(true);
            try {
                const params = { limit: 500 };
                if (currentFilters.block_id) {
                    params.block = currentFilters.block_id;
                } else {
                    params.block_name = currentFilters.block;
                }

                const gpRes = await api.location.getGrampanchayats(params);
                if (!active) return;
                let gps = [];
                const res = gpRes;
                if (Array.isArray(res)) gps = res;
                else if (res?.results && Array.isArray(res.results)) gps = res.results;
                else if (res?.data?.results && Array.isArray(res.data.results)) gps = res.data.results;
                else if (res?.data && Array.isArray(res.data)) gps = res.data;
                else if (res && typeof res === 'object') gps = Object.values(res).filter(item => typeof item === 'object');
                console.log(`✅ useLocations: Received ${gps.length} GPs for "${currentFilters.block}"`);
                setApiGPs(gps);
            } catch (error) {
                console.error(`❌ useLocations: Error fetching GPs for "${currentFilters.block}":`, error);
                if (active) setApiGPs([]);
            } finally {
                setGlobalLoading(false);
            }
        };
        fetchGPs();
        return () => { active = false; };
    }, [currentFilters?.block]);

    // Fetch Villages when GP or Block changes
    useEffect(() => {
        let active = true;
        const fetchVillages = async () => {
            if (!currentFilters?.block) {
                setApiVillages([]);
                return;
            }
            console.log(`📡 useLocations: Fetching villages for block "${currentFilters.block}"...`);
            setGlobalLoading(true);
            try {
                const params = { limit: 1000 };
                if (currentFilters.gp_id) {
                    params.gp = currentFilters.gp_id;
                } else if (currentFilters.gramPanchayat) {
                    params.gp_name = currentFilters.gramPanchayat;
                } else if (currentFilters.block_id) {
                    params.block = currentFilters.block_id;
                } else {
                    params.block_name = currentFilters.block;
                }
                const villageRes = await api.location.getVillages(params);
                if (!active) return;
                let villages = [];
                const res = villageRes;
                if (Array.isArray(res)) villages = res;
                else if (res?.results && Array.isArray(res.results)) villages = res.results;
                else if (res?.data?.results && Array.isArray(res.data.results)) villages = res.data.results;
                else if (res?.data && Array.isArray(res.data)) villages = res.data;
                else if (res && typeof res === 'object') villages = Object.values(res).filter(item => typeof item === 'object');
                console.log(`✅ useLocations: Received ${villages.length} villages`);
                setApiVillages(villages);
            } catch (error) {
                console.error("❌ useLocations: Error fetching villages:", error);
                if (active) setApiVillages([]);
            } finally {
                setGlobalLoading(false);
            }
        };
        fetchVillages();
        return () => { active = false; };
    }, [currentFilters?.gramPanchayat, currentFilters?.block]);

    // Helper to format as title case
    const toTitleCase = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    };

    // Memos for dropdown options - Robust mapping to handle objects or strings
    const availableDistricts = useMemo(() => {
        const rawDistricts = Array.isArray(apiDistricts) ? apiDistricts : [];
        const names = rawDistricts.map(d => {
            const val = typeof d === 'string' ? d : (d?.name || d?.district_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    }, [apiDistricts]);

    const availableBlocks = useMemo(() => {
        const rawBlocks = Array.isArray(apiBlocks) ? apiBlocks : [];
        const names = rawBlocks.map(b => {
            const val = typeof b === 'string' ? b : (b?.name || b?.block_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    }, [apiBlocks]);

    const availableGPs = useMemo(() => {
        const rawGPs = Array.isArray(apiGPs) ? apiGPs : [];
        const names = rawGPs.map(g => {
            const val = typeof g === 'string' ? g : (g?.name || g?.gp_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    }, [apiGPs]);

    const availableVillages = useMemo(() => {
        const rawVillages = Array.isArray(apiVillages) ? apiVillages : [];
        const names = rawVillages.map(v => {
            const val = typeof v === 'string' ? v : (v?.name || v?.village_name || v?.vlg_name);
            return toTitleCase(val);
        }).filter(Boolean);
        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
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
