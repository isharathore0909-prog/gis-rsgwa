import { useMemo, useCallback } from 'react';
import { getAttributeData } from '../../utils/dataProcessors';
import { exportToCSV } from '../../utils/exportUtils';
import { useDataAnalysis } from '../useDataAnalysis';
import { useAppContext } from '../../context/AppContext';
import { toTitleCase } from '../../utils/namingUtils';

export const useAppAnalysis = ({
    filters,
    clickedLocation,
    neighbors,
    selectedBoundary,
    processedBlockData,
    rainfallPoints,
    rainfallStations,
    rainfallStationRecords,
    rainfallDataSource,
    rainfallLoading,
    waterQualityLoading,
    aquiferLoading,
    waterResourcesLoading,
    rajasthanId,
    waterQualityRecords,
    aquiferRecords,
    selectedDams,
    microData,
    tableSelection,
    setClickedLocation,
    setNeighbors
}) => {
    const { setFilters } = useAppContext();

    // Lift analysis logic to share between Map and Sidebar
    const analysisResults = useDataAnalysis({
        globalFilters: filters,
        clickedLocation,
        neighbors,
        selectedBoundary,
        blockData: processedBlockData,
        rainfallPoints,
        rainfallStations,
        rainfallStationRecords,
        rainfallDataSource,
        parentRainfallLoading: rainfallLoading,
        parentWaterQualityLoading: waterQualityLoading,
        parentAquiferLoading: aquiferLoading,
        parentRechargeLoading: waterResourcesLoading,
        rajasthanId
    });

    // Memoize attribute data

    const attributeData = useMemo(() =>
        getAttributeData(
            filters, processedBlockData, neighbors, rainfallPoints,
            waterQualityRecords, aquiferRecords, selectedDams,
            microData,
            rainfallStations, rainfallStationRecords,
            analysisResults?.intersectingStationIds,
            analysisResults?.rainfallStats,
            selectedBoundary,
            analysisResults?.gwreFeatures
        ),
        [
            filters, processedBlockData, neighbors, rainfallPoints,
            waterQualityRecords, aquiferRecords, selectedDams,
            microData,
            rainfallStations, rainfallStationRecords,
            analysisResults?.intersectingStationIds,
            analysisResults?.rainfallStats,
            selectedBoundary,
            analysisResults?.gwreFeatures
        ]
    );

    const onExportData = useCallback(async () => {
        if (!attributeData?.features?.length) {
            alert("No data available to export.");
            return;
        }

        let featuresToExport = attributeData.features;
        if (tableSelection?.length) {
            featuresToExport = attributeData.features.filter(f => tableSelection.includes(f.id));
        }

        const filename = filters?.type ? `${filters.type.replace(/\s+/g, '_')}_data.csv` : 'exported_data.csv';
        await exportToCSV(featuresToExport, filename);
    }, [attributeData, tableSelection, filters?.type]);

    const handleLocationClick = useCallback((latlng, data) => {
        setClickedLocation(latlng);

        // Standardize data: markers often pass [record] instead of record
        const rawItem = (Array.isArray(data) && data.length > 0) ? data[0] : (Array.isArray(data) ? null : data);

        if (!rawItem) {
            setNeighbors([]);
            return;
        }

        // --- Handle Stepwise Administrative Drill-down ---
        // Instead of applying all levels at once, we drill down one level at a time 
        // to show the next logical layer (District -> Block -> GP -> Village)
        if (rawItem.district || rawItem.block || rawItem.gramPanchayat || rawItem.village) {
            setFilters(prev => {
                const next = { ...prev };

                // 1. If at State level (no district), drill to District
                if (!prev.district && rawItem.district) {
                    next.district = toTitleCase(rawItem.district);
                    next.districtId = rawItem.districtId;
                    next.districtCode = rawItem.districtCode;
                    return next;
                }

                // 2. If at District level (no block), drill to Block
                if (prev.district && !prev.block && rawItem.block) {
                    next.block = toTitleCase(rawItem.block);
                    next.blockId = rawItem.blockId;
                    next.blockCode = rawItem.blockCode;
                    return next;
                }

                // 3. If at Block level (no GP), drill to GP
                if (prev.block && !prev.gramPanchayat && rawItem.gramPanchayat) {
                    next.gramPanchayat = toTitleCase(rawItem.gramPanchayat);
                    next.gpId = rawItem.gpId;
                    next.gpCode = rawItem.gpCode;
                    return next;
                }

                // 4. If at GP level (no village), drill to Village
                if (prev.gramPanchayat && !prev.village && rawItem.village) {
                    next.village = toTitleCase(rawItem.village);
                    next.villageId = rawItem.villageId;
                    next.villageCode = rawItem.villageCode;
                    return next;
                }

                // 5. Fallback: If already at Village level or clicking a different area at current level, 
                // we can allow updating the specific level if the parent matches.
                if (rawItem.district && rawItem.district !== prev.district) {
                    // Changing District resets everything below
                    next.district = toTitleCase(rawItem.district);
                    next.districtId = rawItem.districtId;
                    next.districtCode = rawItem.districtCode;
                    next.block = null; next.blockId = null; next.blockCode = null;
                    next.gramPanchayat = null; next.gpId = null; next.gpCode = null;
                    next.village = null; next.villageId = null;
                } else if (rawItem.block && rawItem.block !== prev.block) {
                    // Changing Block resets everything below
                    next.block = toTitleCase(rawItem.block);
                    next.blockId = rawItem.blockId;
                    next.blockCode = rawItem.blockCode;
                    next.gramPanchayat = null; next.gpId = null; next.gpCode = null;
                    next.village = null; next.villageId = null;
                }

                return next;
            });
        }

        // Resolve slim map markers to full historical records if available
        let resolvedItem = rawItem;
        const type = filters?.type;

        if (type === 'Well Inventory' && aquiferRecords?.length > 0) {
            const fullRecord = aquiferRecords.find(r =>
                (r.id && r.id === rawItem.id) ||
                (r.well_id && r.well_id === rawItem.well_id) ||
                (r.well_id && r.well_id === rawItem.id)
            );
            if (fullRecord) {
                resolvedItem = { ...fullRecord, type: 'well_inventory_well' };
            }
        }

        setNeighbors([resolvedItem]);
    }, [filters?.type, aquiferRecords, setClickedLocation, setNeighbors, setFilters]);

    return {
        analysisResults,
        attributeData,
        onExportData,
        handleLocationClick
    };
};
