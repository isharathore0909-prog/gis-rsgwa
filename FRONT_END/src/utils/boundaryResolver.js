import api from '../api';

const districtCache = new Map();
const blockCache = new Map();
const gpCache = new Map();
const villageCache = new Map();
const resolvedHierarchyCache = new Map();

/**
 * Helper to get District object by name
 */
export const getDistrict = async (name) => {
    if (!name) return null;
    const cacheKey = name.toString().toLowerCase().trim();
    if (districtCache.has(cacheKey)) return districtCache.get(cacheKey);

    try {
        const res = await api.location.getDistricts({ name });
        const items = res.results || res;
        const result = items.length > 0 ? items[0] : null;
        if (result) districtCache.set(cacheKey, result);
        return result;
    } catch (e) {
        console.error('Error fetching district:', e);
        return null;
    }
};

/**
 * Helper to get Block object by name and district name
 */
export const getBlock = async (districtName, blockName) => {
    if (!districtName || !blockName) return null;
    const cacheKey = `${districtName}|${blockName}`.toLowerCase().trim();
    if (blockCache.has(cacheKey)) return blockCache.get(cacheKey);

    try {
        const dist = await getDistrict(districtName);
        if (!dist) return null;
        const res = await api.location.getBlocks({ name: blockName, district: dist.id });
        const items = res.results || res;
        const result = items.length > 0 ? items[0] : null;
        if (result) blockCache.set(cacheKey, result);
        return result;
    } catch (e) {
        console.error('Error fetching block:', e);
        return null;
    }
};

/**
 * Helper to get GP object by hierarchy names
 */
export const getGp = async (districtName, blockName, gpName) => {
    if (!districtName || !blockName || !gpName) return null;
    const cacheKey = `${districtName}|${blockName}|${gpName}`.toLowerCase().trim();
    if (gpCache.has(cacheKey)) return gpCache.get(cacheKey);

    try {
        const block = await getBlock(districtName, blockName);
        if (!block) return null;
        const res = await api.location.getGrampanchayats({ name: gpName, block: block.id });
        const items = res.results || res;
        const result = items.length > 0 ? items[0] : null;
        if (result) gpCache.set(cacheKey, result);
        return result;
    } catch (e) {
        console.error('Error fetching GP:', e);
        return null;
    }
};

/**
 * Helper to get Village object by hierarchy names
 */
export const getVillage = async (districtName, blockName, gpName, villageName) => {
    if (!districtName || !blockName || !villageName) return null;
    const cacheKey = `${districtName}|${blockName}|${gpName}|${villageName}`.toLowerCase().trim();
    if (villageCache.has(cacheKey)) return villageCache.get(cacheKey);

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
        const result = items.length > 0 ? items[0] : null;
        if (result) villageCache.set(cacheKey, result);
        return result;
    } catch (e) {
        console.error('Error fetching village:', e);
        return null;
    }
};

/**
 * Get parent ID for the current filter level
 * OPTIMIZED: Uses parallel fetching and bulk lookup where possible
 */
export const resolveParentInfo = async (filters, rajasthanId) => {
    try {
        // Generate a cache key for the current filter set
        const cacheKey = JSON.stringify({ dist: filters?.district, blk: filters?.block, gp: filters?.gramPanchayat, vlg: filters?.village });
        if (resolvedHierarchyCache.has(cacheKey)) {
            return resolvedHierarchyCache.get(cacheKey);
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

        // Update cache (limit size to prevent memory leaks)
        if (resolvedHierarchyCache.size > 50) resolvedHierarchyCache.clear();
        resolvedHierarchyCache.set(cacheKey, result);

        return result;

    } catch (err) {
        console.error('Error getting parent info:', err);
        return { level: 'district', parentId: rajasthanId };
    }
};
