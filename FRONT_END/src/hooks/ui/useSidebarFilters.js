import { useCallback } from 'react';
import { getDistrict, getBlock, getGp } from '../../utils/boundaryResolver';

/**
 * Custom hook to handle complex sidebar filter mapping, state resets,
 * and geographic ID synchronization.
 *
 * IDs are resolved directly from the API (via cached boundaryResolver helpers)
 * so they are always correct on the FIRST selection, regardless of whether
 * the useLocations async lists have finished loading.
 */
export const useSidebarFilters = (filters, updateFilters, apiDistricts, apiBlocks, apiGPs, onFiltersApply) => {

    const handleFilterChange = useCallback(async (field, value) => {
        const newFilters = { [field]: value };

        // Reset logic for hierarchical changes
        if (field === 'district') {
            newFilters.block = '';
            newFilters.gramPanchayat = '';
            newFilters.village = '';
            newFilters.district_id = '';
            newFilters.block_id = '';
            newFilters.gp_id = '';
            newFilters.village_id = '';

            // Try local list first (instant), fall back to API (cached)
            let distId = null;
            const localDist = apiDistricts.find(d =>
                (d.name || d.district_name || '').toString().toUpperCase() === value.toString().toUpperCase()
            );
            if (localDist) {
                distId = localDist.id;
            } else {
                try {
                    const dist = await getDistrict(value);
                    if (dist) distId = dist.id;
                } catch (e) { /* best-effort */ }
            }
            if (distId) newFilters.district_id = distId;
        }

        if (field === 'block') {
            newFilters.gramPanchayat = '';
            newFilters.village = '';
            newFilters.block_id = '';
            newFilters.gp_id = '';
            newFilters.village_id = '';

            // Try local list first (instant), fall back to API (cached)
            let blockId = null;
            const localBlock = apiBlocks.find(b =>
                (b.name || b.block_name || '').toString().toUpperCase() === value.toString().toUpperCase()
            );
            if (localBlock) {
                blockId = localBlock.id;
            } else {
                try {
                    const distName = filters.district;
                    if (distName) {
                        const block = await getBlock(distName, value);
                        if (block) blockId = block.id;
                    }
                } catch (e) { /* best-effort */ }
            }
            if (blockId) newFilters.block_id = blockId;
        }

        if (field === 'gramPanchayat') {
            newFilters.village = '';
            newFilters.gp_id = '';
            newFilters.village_id = '';

            // Try local list first (instant), fall back to API (cached)
            let gpId = null;
            const localGp = apiGPs.find(g =>
                (g.name || g.gp_name || '').toString().toUpperCase() === value.toString().toUpperCase()
            );
            if (localGp) {
                gpId = localGp.id;
            } else {
                try {
                    const distName = filters.district;
                    const blockName = filters.block;
                    if (distName && blockName) {
                        const gp = await getGp(distName, blockName, value);
                        if (gp) gpId = gp.id;
                    }
                } catch (e) { /* best-effort */ }
            }
            if (gpId) newFilters.gp_id = gpId;
        }

        if (field === 'village') {
            newFilters.village_id = '';
            // Villages don't need pre-resolved IDs — the API accepts village_name
        }

        // Apply strict state resets when the Layer type changes
        if (field === 'type') {
            newFilters.district = '';
            newFilters.block = '';
            newFilters.gramPanchayat = '';
            newFilters.village = '';
            newFilters.lat = '';
            newFilters.lng = '';

            newFilters.showRaingaugeStations = false;
            newFilters.showPiezometers = false;
            newFilters.showDams = false;
            newFilters.showCanals = false;
            newFilters.showWaterbodies = false;
            newFilters.showMicro = false;
            newFilters.timestep = 'Monthly';
            newFilters.showMarkers = false;
        }

        updateFilters(newFilters);

        if (onFiltersApply && field !== 'type') {
            onFiltersApply({ ...filters, ...newFilters });
        }
    }, [filters, updateFilters, apiDistricts, apiBlocks, apiGPs, onFiltersApply]);

    return { handleFilterChange };
};
