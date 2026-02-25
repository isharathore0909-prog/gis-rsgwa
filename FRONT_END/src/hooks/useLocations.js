import { useState, useEffect, useMemo } from 'react';
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

    // Initial fetch of districts
    useEffect(() => {
        let ignore = false;
        const fetchDistricts = async () => {
            setLoading(true);
            try {
                // Simplified: Fetch districts for Rajasthan directly using state_name
                // This is more robust than fetching state ID first.
                const districtRes = await api.location.getDistricts({
                    state_name: 'Rajasthan',
                    limit: 100
                });

                if (!ignore) {
                    const data = districtRes.results || districtRes;
                    setApiDistricts(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error fetching districts:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchDistricts();
        return () => { ignore = true; };
    }, []);

    // Fetch blocks when district changes
    useEffect(() => {
        let ignore = false;
        const fetchBlocks = async () => {
            if (!currentFilters?.district) {
                setApiBlocks([]);
                return;
            }
            setLoading(true);
            try {
                const blockRes = await api.location.getBlocks({ district_name: currentFilters.district, limit: 200 });
                if (!ignore) {
                    const data = blockRes.results || blockRes;
                    setApiBlocks(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error fetching blocks:", error);
                setApiBlocks([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchBlocks();
        return () => { ignore = true; };
    }, [currentFilters?.district]);

    // Fetch GPs when block changes
    useEffect(() => {
        let ignore = false;
        const fetchGPs = async () => {
            if (!currentFilters?.block) {
                setApiGPs([]);
                return;
            }
            setLoading(true);
            try {
                const gpRes = await api.location.getGrampanchayats({ block_name: currentFilters.block, limit: 500 });
                if (!ignore) {
                    const data = gpRes.results || gpRes;
                    setApiGPs(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error fetching GPs:", error);
                setApiGPs([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchGPs();
        return () => { ignore = true; };
    }, [currentFilters?.block]);

    // Fetch Villages when GP or Block changes
    useEffect(() => {
        let ignore = false;
        const fetchVillages = async () => {
            if (!currentFilters?.block) {
                setApiVillages([]);
                return;
            }
            setLoading(true);
            try {
                const params = { limit: 1000 };
                if (currentFilters.gramPanchayat) {
                    params.gp_name = currentFilters.gramPanchayat;
                } else {
                    params.block_name = currentFilters.block;
                }
                const villageRes = await api.location.getVillages(params);
                if (!ignore) {
                    const data = villageRes.results || villageRes;
                    setApiVillages(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error fetching villages:", error);
                setApiVillages([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchVillages();
        return () => { ignore = true; };
    }, [currentFilters?.gramPanchayat, currentFilters?.block]);

    // Helper to format as title case
    const toTitleCase = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    };

    // Memos for dropdown options
    const availableDistricts = useMemo(() =>
        [...new Set((apiDistricts || []).map(d => toTitleCase(d.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [apiDistricts]
    );

    const availableBlocks = useMemo(() =>
        [...new Set((apiBlocks || []).map(b => toTitleCase(b.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [apiBlocks]
    );

    const availableGPs = useMemo(() =>
        [...new Set((apiGPs || []).map(g => toTitleCase(g.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [apiGPs]
    );

    const availableVillages = useMemo(() =>
        [...new Set((apiVillages || []).map(v => toTitleCase(v.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [apiVillages]
    );

    return {
        availableDistricts,
        availableBlocks,
        availableGPs,
        availableVillages,
        loading
    };
};
