import { useMemo } from 'react';
import { normalizeDistrictName } from '../../utils/namingUtils';

/**
 * Validates and filters Rajasthan state boundary data
 */
export const useValidatedRajasthanData = (rajasthanData, filters, districtRainfall, legendFeature) => {
    return useMemo(() => {
        if (!rajasthanData) return null;

        // Inject district rainfall data for choropleth
        if (filters?.type === 'Rainfall') {
            const features = rajasthanData.features.map((f, index) => {
                const rawName = f.properties.New_Dist || f.properties.name || f.properties.DIST_NAME || f.properties.District || '';
                const dName = normalizeDistrictName(rawName);
                const hasData = Object.keys(districtRainfall).length > 0;
                let val = districtRainfall[dName];

                if (val === undefined && hasData) {
                    const altKey = rawName.toString().toUpperCase().replace(/[^A-Z]/g, '');
                    val = districtRainfall[altKey];
                }

                if ((val === undefined || val === null || isNaN(val)) && hasData) val = 0;

                return {
                    ...f,
                    properties: {
                        ...f.properties,
                        avg_rainfall: val,
                        rainfall_mm: val,
                        // Ensure legacy match for 'avg_rainfall' or whatever legendFeature calls for
                        [legendFeature]: val
                    }
                };
            });

            return { ...rajasthanData, features };
        }

        return (rajasthanData.type === 'Feature' || rajasthanData.type === 'FeatureCollection')
            ? rajasthanData
            : null;
    }, [rajasthanData, filters?.type, districtRainfall, legendFeature]);
};
