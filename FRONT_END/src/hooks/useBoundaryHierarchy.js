/**
 * useBoundaryHierarchy Hook
 * 
 * Manages hierarchical boundary fetching:
 * - Initially shows all districts of Rajasthan
 * - When district selected: shows blocks of that district
 * - When block selected: shows GPs of that block
 * - When GP selected: shows villages of that GP
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { reprojectGeoJSON } from '../utils/reproject';

export const useBoundaryHierarchy = (filters, rajasthanId) => {
    const [boundaries, setBoundaries] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentLevel, setCurrentLevel] = useState('district');

    /**
     * Helper to get District ID by name
     */
    const getDistrictId = useCallback(async (name) => {
        if (!name) return null;
        try {
            const res = await api.location.getDistricts({ name });
            const items = res.results || res;
            return items.length > 0 ? items[0].id : null;
        } catch (e) {
            console.error('Error fetching district ID:', e);
            return null;
        }
    }, []);

    /**
     * Helper to get Block ID by name and district name
     */
    const getBlockId = useCallback(async (districtName, blockName) => {
        if (!districtName || !blockName) return null;
        try {
            const distId = await getDistrictId(districtName);
            if (!distId) return null;
            const res = await api.location.getBlocks({ name: blockName, district: distId });
            const items = res.results || res;
            return items.length > 0 ? items[0].id : null;
        } catch (e) {
            console.error('Error fetching block ID:', e);
            return null;
        }
    }, [getDistrictId]);

    /**
     * Helper to get GP ID by hierarchy names
     */
    const getGpId = useCallback(async (districtName, blockName, gpName) => {
        if (!districtName || !blockName || !gpName) return null;
        try {
            const blockId = await getBlockId(districtName, blockName);
            if (!blockId) return null;
            const res = await api.location.getGrampanchayats({ name: gpName, block: blockId });
            const items = res.results || res;
            return items.length > 0 ? items[0].id : null;
        } catch (e) {
            console.error('Error fetching GP ID:', e);
            return null;
        }
    }, [getBlockId]);

    /**
     * Fetch boundaries from database API with automatic external fetch for missing boundaries
     */
    const fetchBoundariesForLevel = useCallback(async (level, parentId) => {
        try {
            console.log(`📡 Fetching ${level} boundaries (parent_id: ${parentId})...`);

            const params = {
                layer: level,
                fetch: true  // Enable automatic external API fetch for missing boundaries
            };

            if (parentId) {
                params.parent_id = parentId;
            }

            const data = await api.boundaries.getCollection(params);

            if (data && data.features && data.features.length > 0) {
                console.log(`✅ Received ${data.features.length} ${level} boundaries`);
                return reprojectGeoJSON(data);
            }

            console.warn(`⚠️ No ${level} boundaries found (parent_id: ${parentId})`);
            return null;
        } catch (err) {
            console.error(`❌ Error fetching ${level} boundaries:`, err);
            throw err;
        }
    }, []);

    /**
     * Get parent ID for the current filter level
     */
    const getParentInfo = useCallback(async (filters) => {
        try {
            // Village selected -> Show that village or all villages of GP
            if (filters?.village && filters?.gramPanchayat && filters?.taluka && filters?.district) {
                const gpId = await getGpId(filters.district, filters.taluka, filters.gramPanchayat);
                return { level: 'village', parentId: gpId };
            }

            // GP selected -> Show villages of that GP
            if (filters?.gramPanchayat && filters?.taluka && filters?.district) {
                const gpId = await getGpId(filters.district, filters.taluka, filters.gramPanchayat);
                return { level: 'village', parentId: gpId };
            }

            // Block selected -> Show GPs of that block
            if (filters?.taluka && filters?.district) {
                const blockId = await getBlockId(filters.district, filters.taluka);
                return { level: 'gp', parentId: blockId };
            }

            // District selected -> Show blocks of that district
            if (filters?.district) {
                const distId = await getDistrictId(filters.district);
                return { level: 'block', parentId: distId };
            }

            // Default: Show all districts of Rajasthan
            return { level: 'district', parentId: rajasthanId };

        } catch (err) {
            console.error('Error getting parent info:', err);
            return { level: 'district', parentId: rajasthanId };
        }
    }, [rajasthanId]);

    /**
     * Main effect to fetch boundaries based on filters
     */
    useEffect(() => {
        const fetchBoundaries = async () => {
            // Don't fetch if we don't have basic info yet
            if (!rajasthanId && !filters?.district) {
                setBoundaries(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Determine what level to show based on filters
                const { level, parentId } = await getParentInfo(filters);
                setCurrentLevel(level);

                console.log(`🎯 Fetching boundaries for level: ${level}, parent: ${parentId}`);

                // Fetch boundaries for the determined level
                const boundaryData = await fetchBoundariesForLevel(level, parentId);

                if (boundaryData) {
                    setBoundaries(boundaryData);
                    console.log(`✅ Successfully loaded ${level} boundaries`);
                } else {
                    console.warn(`⚠️ No boundaries found for ${level}`);
                    setBoundaries(null);
                }

            } catch (err) {
                console.error('❌ Error in boundary hierarchy:', err);
                setError(err.message);
                setBoundaries(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBoundaries();
    }, [
        filters?.district,
        filters?.taluka,
        filters?.gramPanchayat,
        filters?.village,
        rajasthanId,
        fetchBoundariesForLevel,
        getParentInfo
    ]);

    return {
        boundaries,
        loading,
        error,
        currentLevel
    };
};

export default useBoundaryHierarchy;
