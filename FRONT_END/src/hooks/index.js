/**
 * Custom Hooks - Centralized Export
 * 
 * This file provides a single import point for all custom hooks.
 */

// Data Fetching Hooks
export {
    useDistrictRainfall,
    useWaterQuality,
    useAquiferData,
    useGeoJSONData
} from './useMapData';

// Data Processing Hooks
export {
    useRainfallStatsByBlock,
    useAggregatedRainfallPoints,
    useDamMarkers
} from './useMapProcessing';

export { useBoundaryHierarchy } from './useBoundaryHierarchy';

// GeoJSON Processing Hooks
export {
    useValidatedRajasthanData,
    useSelectedDistrictData,
    useFilteredBlockData,
    useValidatedBlockData,
    useValidatedBoundaries
} from './useGeoJSONProcessing';

// Legend Hooks
export {
    useLegendData,
    useFeatureOptions
} from './useLegend';

// App Logic Hooks
export { useAppLogic } from './useAppLogic';
export { useMapView } from './useMapView';
