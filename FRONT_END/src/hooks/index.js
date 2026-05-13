/**
 * Custom Hooks - Centralized Export
 * 
 * This file provides a single import point for all custom hooks.
 */

// Data Fetching Hooks
export { useDistrictRainfall, useLocationRainfall } from './data/useRainfallData';
export { useWaterQuality } from './data/useWaterQualityData';
export { useAquiferData } from './data/useAquiferData';
export { usePiezometerData } from './data/usePiezometerData';
export { useGeoJSONData } from './data/useGeoJSONData';
export { useSpatialLayerStats } from './data/useSpatialLayerStats';
export { useRechargeLoader } from './core/loaders/useRechargeLoader';

// Data Processing Hooks
export {
    useRainfallStatsByBlock,
    useRainfallStatsByDistrict,
    useAggregatedRainfallPoints,
    useDamMarkers
} from './geo/useMapProcessing';

export { useBoundaryHierarchy } from './geo/useBoundaryHierarchy';

// GeoJSON Processing Hooks
export {
    useValidatedRajasthanData,
    useSelectedDistrictData,
    useFilteredBlockData,
    useValidatedBlockData,
    useValidatedBoundaries,
    useSelectedBoundaryGeometry
} from './geo';

// Legend Hooks
export {
    useLegendData,
    useFeatureOptions
} from './ui/useLegend';

// App Logic Hooks
export { useAppLogic } from './core/useAppLogic';
export { useDataAnalysis } from './useDataAnalysis';
export { useMapView } from './ui/useMapView';
export { useLocations } from './ui/useLocations';
