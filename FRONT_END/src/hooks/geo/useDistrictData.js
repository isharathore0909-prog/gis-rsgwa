import { useMemo } from 'react';
import { normalizeDistrictName } from '../../utils/namingUtils';

/**
 * Filters district boundary data
 * Prioritizes dynamic DB-fetched boundary if available to ensure alignment with children.
 */
export const useSelectedDistrictData = (rajasthanData, district, dynamicBoundaries, blockBoundaryData, isLoading = false) => {
    return useMemo(() => {
        if (!district || !rajasthanData) return null;

        const searchName = normalizeDistrictName(district);

        // 1. Primary Source for Map Navigation: Static/Stable Rajasthan Data
        // Using this for fly-to ensures the map zooms immediately and stays there,
        // rather than jerking between rough and high-precision boundaries.
        const staticFeature = rajasthanData.features.find(f => {
            const p = f.properties;
            const distName = p.New_Dist || p.name || p.DIST_NAME || p.district || p.dist_name || p.district_name || '';
            return normalizeDistrictName(distName) === searchName;
        });

        if (staticFeature) {
            return { type: 'FeatureCollection', features: [staticFeature] };
        }

        // 2. Fallback: Check blockBoundaryData or dynamicBoundaries if static doesn't have it
        const findInCollection = (collection) => {
            if (!collection?.features) return null;
            return collection.features.find(f => {
                const p = f.properties;
                return (p.is_parent === true || p.level === 'district') &&
                    normalizeDistrictName(p.name || p.DIST_NAME || '') === searchName;
            });
        };

        const dbFeature = findInCollection(blockBoundaryData) || findInCollection(dynamicBoundaries);

        if (dbFeature) {
            return { type: 'FeatureCollection', features: [dbFeature] };
        }

        return null;
    }, [rajasthanData, district, dynamicBoundaries, blockBoundaryData]);
};
