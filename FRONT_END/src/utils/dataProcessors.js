import { processGWREData } from './processors/processGWREData';
import { processGWLevelData } from './processors/processGWLevelData';
import { processWaterResourcesData } from './processors/processWaterResourcesData';
import { processRainfallData } from './processors/processRainfallData';
import { processWaterQualityData, processWellInventoryData } from './processors/processQualityWellData';

export const getAttributeData = (filters, processedBlockData, neighbors, rainfallPoints, waterQualityRecords, aquiferRecords, selectedDams, microData, rainfallStations, rainfallStationRecords, intersectingStationIds, rainfallStats, selectedBoundary, gwreFeatures) => {
    if (!filters || !filters.type) return null;

    switch (filters.type) {
        case 'Ground Water Resource Estimation':
            return processGWREData(filters, processedBlockData, gwreFeatures);

        case 'Ground Water Level':
            return processGWLevelData(filters, neighbors);

        case 'Water Resources':
            return processWaterResourcesData(filters, processedBlockData, selectedDams, null, null, microData, selectedBoundary);

        case 'Rainfall':
            return processRainfallData(filters, neighbors, rainfallPoints, rainfallStations, rainfallStationRecords, intersectingStationIds, rainfallStats);

        case 'Water Quality':
            return processWaterQualityData(filters, waterQualityRecords);

        case 'Well Inventory':
            return processWellInventoryData(filters, aquiferRecords);

        default:
            return null;
    }
};
