import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api';
import { reprojectGeoJSON } from '../../utils/reproject';
import { resolveParentInfo } from '../../utils/boundaryResolver';

export const useBoundaryHierarchy = (filters, rajasthanId) => {
    const [boundaries, setBoundaries] = useState(null);
    const [selectedBoundary, setSelectedBoundary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentLevel, setCurrentLevel] = useState('district');
    const [selectedLevel, setSelectedLevel] = useState(null);

    /**
     * Fetch boundaries from database API with automatic external fetch for missing boundaries
     */
    const fetchBoundariesForLevel = useCallback(async (level, parentId) => {
        try {

            const params = {
                layer: level,
                fetch: false  // Disabled external auto-sync to dramatically improve load times
            };

            if (parentId) {
                params.parent_id = parentId;
            }

            const data = await api.boundaries.getCollection(params);

            if (data && data.features && data.features.length > 0) {
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
     * Main effect to fetch boundaries based on filters
     */
    useEffect(() => {
        let ignore = false;

        const fetchBoundaries = async () => {
            // Don't fetch if we don't have basic info yet
            if (!rajasthanId && !filters?.district) {
                setBoundaries(null);
                setSelectedBoundary(null);
                setLoading(false);
                return;
            }

            // Skip spurious re-run when rajasthanId just resolved but user hasn't selected anything yet
            if (rajasthanId && !filters?.district) {
                setBoundaries(null);
                setSelectedBoundary(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            // Safety fallback: Clear loading state after 8s if it gets stuck
            const timeoutId = setTimeout(() => {
                if (!ignore) setLoading(false);
            }, 8000);

            try {
                // Determine what level to show based on filters
                const { level, parentId, selectedLevel: selLvl, selectedCode, selectedName } = await resolveParentInfo(filters, rajasthanId);
                if (ignore) return; // Filter changed while resolving — discard stale result

                setCurrentLevel(level);
                setSelectedLevel(selLvl);


                // 1. Fetch boundaries for the determined level (CHILDREN)
                const boundaryData = await fetchBoundariesForLevel(level, parentId);
                if (ignore) return; // Filter changed while fetching — discard stale result

                if (boundaryData) {
                    setBoundaries(boundaryData);
                } else {
                    console.warn(`⚠️ No boundaries found for ${level}`);
                    setBoundaries(null);
                }

                // 2. Fetch or Extract Selected Boundary (THE ENTITY ITSELF)
                if (selLvl && (level !== 'district')) {

                    let selGeom = null;

                    // 2a. Look into the fetched boundaries. The backend often includes the parent boundary 
                    // (with is_parent: true). So we should search the fetched data regardless of level match.
                    if (boundaryData) {
                        const searchName = selectedName.toString().trim().toLowerCase();
                        const searchCode = selectedCode?.toString().trim().toLowerCase();

                        const feature = boundaryData.features.find(f => {
                            const p = f.properties;

                            // If this is explicitly the parent feature we are looking for, grab it
                            if (p.is_parent && p.level === selLvl) return true;

                            // Only do fuzzy name/code match if the level matches the target or if we don't know the exact level
                            const levelMatch = !p.level || p.level === selLvl;
                            if (!levelMatch) return false;

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
                            selGeom = feature;
                        }
                    }

                    // 2b. If not found in children, fetch specifically from level-specific APIs
                    if (!selGeom) {
                        try {
                            const codeToUse = selectedCode || selectedName;
                            if (codeToUse) {
                                let data = null;

                                // Use backend aggregator which has robust spatial fix-up and local caching
                                data = await api.boundaries.getByCode({ layer: selLvl, code: selectedCode || selectedName });

                                if (data && !ignore) {
                                    // Handle both FeatureCollection and single Feature
                                    const feature = data.type === 'FeatureCollection' ? data.features[0] : (data.type === 'Feature' ? data : null);
                                    if (feature) selGeom = reprojectGeoJSON(feature);
                                }
                            }
                        } catch (e) {
                            console.warn(`⚠️ Could not fetch specific boundary for ${selLvl} ${selectedName}`, e);
                        }
                    }

                    if (ignore) return;

                    if (selGeom) {
                        setSelectedBoundary(selGeom);
                    } else {
                        console.warn(`⚠️ Geometry missing for ${selLvl} ${selectedName}`);
                        setSelectedBoundary(null);
                    }
                } else {
                    setSelectedBoundary(null);
                }

            } catch (err) {
                if (ignore) return;
                console.error('❌ Error in boundary hierarchy:', err);
                setError(err.message);
                setBoundaries(null);
                setSelectedBoundary(null);
            } finally {
                if (!ignore) setLoading(false);
                clearTimeout(timeoutId);
            }
        };

        fetchBoundaries();
        return () => { ignore = true; };
    }, [
        filters?.district,
        filters?.block,
        filters?.gramPanchayat,
        filters?.village,
        rajasthanId,
        fetchBoundariesForLevel
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
        if (selectedBoundary) {
            const p = selectedBoundary.properties;

            const levelToFilterValue = {
                'district': filterDist,
                'block': filterBlock,
                'gp': filterGp,
                'village': filterVillage
            };
            const targetFilterValue = selectedLevel ? levelToFilterValue[selectedLevel] : filterDist;

            // Rule D: If the filter for this level was CLEARED or CHANGED, the boundary is stale
            if (!targetFilterValue) return true;

            const bName = normalize(p.name || p.DIST_NAME || p.BLOCK_NAME || p.gp_name || p.v_name || '');
            const bCode = normalize(p.code || p.dist_code || p.block_code || p.gp_code || p.v_code || '');
            if (targetFilterValue !== bName && targetFilterValue !== bCode) {
                // Special case: if name is a substring (sometimes labels differ slightly)
                if (!bName.includes(targetFilterValue) && !targetFilterValue.includes(bName)) return true;
            }
        }

        // 2. Check Boundaries Collection (The children being displayed)
        const parentFeature = boundaries?.features?.find(f => f.properties?.is_parent);
        if (parentFeature && currentLevel) {
            const p = parentFeature.properties;
            const levelToParentFilter = {
                'block': filterDist,
                'gp': filterBlock,
                'village': filterGp
            };
            const targetParentFilter = levelToParentFilter[currentLevel];
            if (targetParentFilter) {
                const pName = normalize(p.name || '');
                const pCode = normalize(p.code || '');
                if (targetParentFilter !== pName && targetParentFilter !== pCode) return true;
            }
        }

        const firstChildFeature = boundaries?.features?.find(f => !f.properties?.is_parent);
        if (firstChildFeature && currentLevel) {
            const bLevel = firstChildFeature.properties?.level || '';

            // Rule E: Strict Geometric Hierarchy Mismatch
            if (bLevel && bLevel !== currentLevel) return true;
        }

        return false;
    })();

    // Maintain a persistent record of the boundary hierarchy to show all levels at once
    const [hierarchy, setHierarchy] = useState({ district: null, block: null, gp: null, village: null });

    useEffect(() => {
        if (!selectedBoundary || !selectedLevel) return;

        setHierarchy(prev => {
            const next = { ...prev };
            if (selectedLevel === 'district') {
                next.district = selectedBoundary;
                next.block = null;
                next.gp = null;
                next.village = null;
            } else if (selectedLevel === 'block') {
                next.block = selectedBoundary;
                next.gp = null;
                next.village = null;
            } else if (selectedLevel === 'gp') {
                next.gp = selectedBoundary;
                next.village = null;
            } else if (selectedLevel === 'village') {
                next.village = selectedBoundary;
            }
            return next;
        });
    }, [selectedBoundary, selectedLevel]);

    // Clear state when district changes to a completely different one or is cleared (via filters)
    useEffect(() => {
        if (!filters?.district) {
            setHierarchy({ district: null, block: null, gp: null, village: null });
            setBoundaries(null);
            setSelectedBoundary(null);
            setSelectedLevel(null);
        }
    }, [filters?.district]);

    return useMemo(() => ({
        boundaries: isStateStale ? null : boundaries,
        selectedBoundary: isStateStale ? null : selectedBoundary,
        selectedLevel: isStateStale ? null : (selectedLevel || (filters?.village ? 'village' : (filters?.gramPanchayat ? 'gp' : (filters?.block ? 'block' : (filters?.district ? 'district' : null))))),
        loading: loading || isStateStale,
        error,
        currentLevel: isStateStale ? 'district' : currentLevel,
        hierarchy: isStateStale ? { district: null, block: null, gp: null, village: null } : hierarchy
    }), [boundaries, selectedBoundary, isStateStale, selectedLevel, filters?.village, filters?.gramPanchayat, filters?.block, filters?.district, loading, error, currentLevel, hierarchy]);
};

export default useBoundaryHierarchy;
