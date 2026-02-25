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
    const [selectedBoundary, setSelectedBoundary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentLevel, setCurrentLevel] = useState('district');
    const [selectedLevel, setSelectedLevel] = useState(null);

    /**
     * Helper to get District object by name
     */
    const getDistrict = useCallback(async (name) => {
        if (!name) return null;
        try {
            const res = await api.location.getDistricts({ name });
            const items = res.results || res;
            return items.length > 0 ? items[0] : null;
        } catch (e) {
            console.error('Error fetching district:', e);
            return null;
        }
    }, []);

    /**
     * Helper to get Block object by name and district name
     */
    const getBlock = useCallback(async (districtName, blockName) => {
        if (!districtName || !blockName) return null;
        try {
            const dist = await getDistrict(districtName);
            if (!dist) return null;
            const res = await api.location.getBlocks({ name: blockName, district: dist.id });
            const items = res.results || res;
            return items.length > 0 ? items[0] : null;
        } catch (e) {
            console.error('Error fetching block:', e);
            return null;
        }
    }, [getDistrict]);

    /**
     * Helper to get GP object by hierarchy names
     */
    const getGp = useCallback(async (districtName, blockName, gpName) => {
        if (!districtName || !blockName || !gpName) return null;
        try {
            const block = await getBlock(districtName, blockName);
            if (!block) return null;
            const res = await api.location.getGrampanchayats({ name: gpName, block: block.id });
            const items = res.results || res;
            return items.length > 0 ? items[0] : null;
        } catch (e) {
            console.error('Error fetching GP:', e);
            return null;
        }
    }, [getBlock]);

    /**
     * Helper to get Village object by hierarchy names
     */
    const getVillage = useCallback(async (districtName, blockName, gpName, villageName) => {
        if (!districtName || !blockName || !villageName) return null;
        try {
            const block = await getBlock(districtName, blockName);
            if (!block) return null;

            const params = { name: villageName, block: block.id };
            if (gpName) {
                const gp = await getGp(districtName, blockName, gpName);
                if (gp) params.gp = gp.id;
            }

            const res = await api.location.getVillages(params);
            const items = res.results || res;
            return items.length > 0 ? items[0] : null;
        } catch (e) {
            console.error('Error fetching village:', e);
            return null;
        }
    }, [getBlock, getGp]);

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

    // Simple in-memory cache for resolved IDs to speed up navigation
    const [resolvedIds, setResolvedIds] = useState({});

    /**
     * Get parent ID for the current filter level
     * OPTIMIZED: Uses parallel fetching and bulk lookup where possible
     */
    const getParentInfo = useCallback(async (filters) => {
        try {
            // Generate a cache key for the current filter set
            const cacheKey = JSON.stringify(filters || {});
            if (resolvedIds[cacheKey]) {
                console.log('🚀 Using cached hierarchy IDs');
                return resolvedIds[cacheKey];
            }

            let result = { level: 'district', parentId: rajasthanId };

            // Case: Village selected
            if (filters?.village && filters?.block && filters?.district) {
                // Fetch village and parent info in parallel
                const [vlg, blockObj] = await Promise.all([
                    getVillage(filters.district, filters.block, filters.gramPanchayat, filters.village),
                    getBlock(filters.district, filters.block)
                ]);

                let gp = null;
                if (filters.gramPanchayat) {
                    gp = await getGp(filters.district, filters.block, filters.gramPanchayat);
                }

                result = {
                    level: 'village',
                    parentId: gp?.id || blockObj?.id,
                    selectedLevel: 'village',
                    selectedName: filters.village,
                    selectedId: vlg?.id,
                    selectedCode: vlg?.code
                };

                // Fallback: If we couldn't get IDs from DB but have names, try location codes
                if (!vlg?.id) {
                    const res = await api.location.getLocationCodes({
                        dist_name: filters.district,
                        block_name: filters.block,
                        gp_name: filters.gramPanchayat || '',
                        vlg_name: filters.village
                    });
                    const items = res.results || res;
                    if (items.length > 0) {
                        const loc = items[0];
                        result.selectedCode = loc.vlg_code;
                        if (!result.selectedId) result.selectedId = loc.id;
                    }
                }
            }
            // Case: GP selected
            else if (filters?.gramPanchayat && filters?.block && filters?.district) {
                const gp = await getGp(filters.district, filters.block, filters.gramPanchayat);
                result = { level: 'village', parentId: gp?.id, selectedLevel: 'gp', selectedName: filters.gramPanchayat, selectedId: gp?.id, selectedCode: gp?.code };
            }
            // Case: Block selected
            else if (filters?.block && filters?.district) {
                const blockObj = await getBlock(filters.district, filters.block);
                result = { level: 'gp', parentId: blockObj?.id, selectedLevel: 'block', selectedName: filters.block, selectedId: blockObj?.id, selectedCode: blockObj?.code };
            }
            // Case: District selected
            else if (filters?.district) {
                const dist = await getDistrict(filters.district);
                result = { level: 'block', parentId: dist?.id, selectedLevel: 'district', selectedName: filters.district, selectedId: dist?.id, selectedCode: dist?.code };
            }

            // Update cache
            setResolvedIds(prev => ({ ...prev, [cacheKey]: result }));
            return result;

        } catch (err) {
            console.error('Error getting parent info:', err);
            return { level: 'district', parentId: rajasthanId };
        }
    }, [rajasthanId, getDistrict, getBlock, getGp, getVillage, resolvedIds]);

    /**
     * Main effect to fetch boundaries based on filters
     */
    useEffect(() => {
        const fetchBoundaries = async () => {
            // Don't fetch if we don't have basic info yet
            if (!rajasthanId && !filters?.district) {
                setBoundaries(null);
                setSelectedBoundary(null);
                return;
            }

            setLoading(true);
            setError(null);
            setBoundaries(null);
            setSelectedBoundary(null);

            try {
                // Determine what level to show based on filters
                const { level, parentId, selectedLevel: selLvl, selectedCode, selectedName } = await getParentInfo(filters);
                setCurrentLevel(level);
                setSelectedLevel(selLvl);

                console.log(`🎯 Fetching boundaries for level: ${level}, parent: ${parentId}`);

                // 1. Fetch boundaries for the determined level (CHILDREN)
                const boundaryData = await fetchBoundariesForLevel(level, parentId);

                if (boundaryData) {
                    setBoundaries(boundaryData);
                    console.log(`✅ Successfully loaded ${level} boundaries`);
                } else {
                    console.warn(`⚠️ No boundaries found for ${level}`);
                    setBoundaries(null);
                }

                // 2. Fetch or Extract Selected Boundary (THE ENTITY ITSELF)
                if (selectedLevel && (level !== 'district')) {
                    console.log(`🎯 Resolving selected boundary: ${selectedLevel} - ${selectedName} (Code: ${selectedCode})`);

                    let selGeom = null;

                    // 2a. Look into the child boundaries we just fetched
                    if (boundaryData) {
                        const searchName = selectedName.toString().trim().toLowerCase();
                        const searchCode = selectedCode?.toString().trim().toLowerCase();

                        const feature = boundaryData.features.find(f => {
                            const p = f.properties;
                            const name = (p.name || p.vllg_name || p.v_name || p.Village || p.BLOCK_NAME || p.DIST_NAME || p.gp_name || '').toString().toLowerCase();
                            const code = (p.code || p.vllg_code || p.v_code || p.block_code || p.dist_code || '').toString().toLowerCase();

                            // Perfect match by code
                            if (searchCode && code === searchCode) return true;

                            // Normalization for robust name comparison
                            const normName = name.replace(/[^a-z0-9]/g, '');
                            const normSearch = searchName.replace(/[^a-z0-9]/g, '');

                            // Match by normalized name
                            if (normName === normSearch) return true;

                            // Partial match for fuzzy datasets
                            if (normName.includes(normSearch) || normSearch.includes(normName)) {
                                if (normName.length > 3 && normSearch.length > 3) return true;
                            }

                            return false;
                        });

                        if (feature) {
                            console.log(`✅ Found selected boundary ${selectedName} in child collection`);
                            selGeom = feature;
                        }
                    }

                    // 2b. If not found in children, fetch specifically from level-specific APIs
                    if (!selGeom) {
                        try {
                            const codeToUse = selectedCode || selectedName;
                            if (codeToUse) {
                                console.log(`📡 Fetching specific ${selectedLevel} boundary: ${codeToUse}`);
                                let data = null;

                                if (selectedLevel === 'village') {
                                    if (selectedCode) data = await api.boundaries.getByVillageCode(selectedCode);
                                    else data = await api.boundaries.getByCode({ layer: 'village', code: selectedName });
                                } else if (selectedLevel === 'gp') {
                                    if (selectedCode) data = await api.boundaries.getByGPCode(selectedCode);
                                    else data = await api.boundaries.getByCode({ layer: 'gp', code: selectedName });
                                } else if (selectedLevel === 'block') {
                                    if (selectedCode) data = await api.boundaries.getByBlockCode(selectedCode);
                                    else data = await api.boundaries.getByCode({ layer: 'block', code: selectedName });
                                } else {
                                    data = await api.boundaries.getByCode({ layer: selectedLevel, code: codeToUse });
                                }

                                if (data) {
                                    // Handle both FeatureCollection and single Feature
                                    const feature = data.type === 'FeatureCollection' ? data.features[0] : (data.type === 'Feature' ? data : null);
                                    if (feature) selGeom = reprojectGeoJSON(feature);
                                }
                            }
                        } catch (e) {
                            console.warn(`⚠️ Could not fetch specific boundary for ${selectedLevel} ${selectedName}`, e);
                        }
                    }

                    if (selGeom) {
                        console.log(`✅ Selected boundary geometry ready for ${selectedLevel}`);
                        setSelectedBoundary(selGeom);
                    } else {
                        console.warn(`⚠️ Geometry missing for ${selectedLevel} ${selectedName}`);
                        setSelectedBoundary(null);
                    }
                } else {
                    setSelectedBoundary(null);
                }

            } catch (err) {
                console.error('❌ Error in boundary hierarchy:', err);
                setError(err.message);
                setBoundaries(null);
                setSelectedBoundary(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBoundaries();
    }, [
        filters?.district,
        filters?.block,
        filters?.gramPanchayat,
        filters?.village,
        rajasthanId,
        fetchBoundariesForLevel,
        getParentInfo
    ]);

    // Proactive Stale Detection:
    // This logic ensures that if the data currently held in state doesn't match the active filters, 
    // we return null instead of "ghost" boundaries from the previous selection.
    const isStateStale = (() => {
        const normalize = (val) => val?.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || '';

        const filterDist = normalize(filters?.district);
        const filterBlock = normalize(filters?.block);
        const filterGp = normalize(filters?.gramPanchayat);
        const filterVillage = normalize(filters?.village);

        // 1. Check Selected Boundary (The active entity being highlighted)
        if (selectedBoundary && selectedLevel) {
            const p = selectedBoundary.properties;
            const bName = normalize(p.name || p.vllg_name || p.v_name || p.Village || p.BLOCK_NAME || p.Block || p.DIST_NAME || p.District || p.gp_name || p.GP_NAME || p.name_en || '');
            const bDist = normalize(p.DIST_NAME || p.District || p.dist_name || p.district_name || p.district || '');
            const bBlock = normalize(p.BLOCK_NAME || p.Block || p.block_name || p.block || '');

            // Rule A: If a district filter is active, the boundary's district MUST match (if present)
            if (filterDist && bDist && bDist !== filterDist) return true;

            // Rule B: If a block filter is active, the boundary's block MUST match (if present)
            if (filterBlock && bBlock && bBlock !== filterBlock) return true;

            // Rule C: The boundary itself should match the specific level filter
            const levelToFilterValue = {
                'district': filterDist,
                'block': filterBlock,
                'gp': filterGp,
                'village': filterVillage
            };

            const targetFilterValue = levelToFilterValue[selectedLevel];
            if (targetFilterValue && bName && bName !== targetFilterValue && !bName.includes(targetFilterValue) && !targetFilterValue.includes(bName)) {
                return true;
            }

            // Rule D: If the filter for this level was CLEARED, the boundary is stale
            if (!targetFilterValue) return true;
        }

        // 2. Check Boundaries Collection (The children being displayed)
        if (boundaries?.features?.[0] && currentLevel) {
            const p = boundaries.features[0].properties;
            const bDist = normalize(p.DIST_NAME || p.District || p.dist_name || p.district_name || p.district || "");
            const bBlock = normalize(p.BLOCK_NAME || p.Block || p.block_name || p.block || "");
            const bGp = normalize(p.gp_name || p.GP_NAME || p.Grampanchayat || p.GP || "");

            // If currentLevel is 'block', these kids MUST belong to the current district
            if (currentLevel === 'block' && filterDist && bDist && bDist !== filterDist) return true;

            // If currentLevel is 'gp', these kids MUST belong to the current block
            if (currentLevel === 'gp' && filterBlock && bBlock && bBlock !== filterBlock) return true;

            // If currentLevel is 'village', these kids MUST belong to the current GP
            if (currentLevel === 'village' && filterGp && bGp && bGp !== filterGp) return true;
        }

        return false;
    })();

    return {
        boundaries: isStateStale ? null : boundaries,
        selectedBoundary: isStateStale ? null : selectedBoundary,
        selectedLevel: isStateStale ? null : selectedLevel,
        loading: loading || isStateStale, // Treat stale state as loading to show transition
        error,
        currentLevel: isStateStale ? 'district' : currentLevel
    };
};

export default useBoundaryHierarchy;
