import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';

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

                // Robust extraction of results
                const data = districtRes.results || districtRes;
                const districts = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);

                console.log(`✅ useLocations: Received ${districts.length} districts`);
                setApiDistricts(districts);
            } catch (error) {
                console.error("❌ useLocations: Error fetching districts:", error);
                // On error, we don't set anything to allow retry if triggered by re-render
            } finally {
                if (active) setGlobalLoading(false);
            }
        };
        fetchDistricts();
        return () => { active = false; };
    }, [apiDistricts.length]); // Retry if empty on re-render

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
                const blockRes = await api.location.getBlocks({
                    district_name: currentFilters.district,
                    limit: 200
                });
                if (!active) return;
                const data = blockRes.results || blockRes;
                const blocks = Array.isArray(data) ? data : [];
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
                const gpRes = await api.location.getGrampanchayats({
                    block_name: currentFilters.block,
                    limit: 500
                });
                if (!active) return;
                const data = gpRes.results || gpRes;
                const gps = Array.isArray(data) ? data : [];
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
                if (currentFilters.gramPanchayat) {
                    params.gp_name = currentFilters.gramPanchayat;
                } else {
                    params.block_name = currentFilters.block;
                }
                const villageRes = await api.location.getVillages(params);
                if (!active) return;
                const data = villageRes.results || villageRes;
                const villages = Array.isArray(data) ? data : [];
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
