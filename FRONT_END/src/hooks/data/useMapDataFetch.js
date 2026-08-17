import { useMemo } from 'react';
import {
    useDistrictRainfall,
    usePiezometerData,
    useGeoJSONData,
    useRainfallStatsByDistrict,
    useAggregatedRainfallPoints,
    useDamMarkers,
    useFilteredBlockData,
    useValidatedBlockData,
    useLocationRainfall,
    useSelectedDistrictData,
    useValidatedBoundaries,
    useSelectedBoundaryGeometry,
    useRechargeLoader
} from '../index';
import { RAJASTHAN_DAMS_DATA } from '../../data/damsData';
import { reprojectGeoJSON } from '../../utils/reproject';

export const useMapDataFetch = ({
    filters,
    rainfallPoints,
    blockBoundaryData,
    rajasthanData,
    dynamicBoundaries,
    rainfallStations,
    rainfallStationRecords,
    legendFeature,
    isLoading
}) => {
    const { data: districtRainfall, loading: districtRainfallLoading } = useDistrictRainfall(filters?.type === 'Rainfall', filters);
    const { data: piezometerRecords, loading: piezometersLoading } = usePiezometerData(filters?.type === 'Rainfall' && filters?.showPiezometers, filters);

    // Determine the active drill-down level for rainfall to avoid over-fetching
    let drillLevel = null;
    if (filters?.gramPanchayat) drillLevel = 'village';
    else if (filters?.block) drillLevel = 'gp';
    else if (filters?.district) drillLevel = 'block';

    const { data: dynamicRainfallStats, loading: dynamicRainfallLoading } = useLocationRainfall(
        filters?.type === 'Rainfall' && drillLevel !== null,
        filters,
        drillLevel
    );

    // Also strictly fetch block stats if not already captured by the generic drill-down
    // This supports the side-by-side District+Block maps view in some states
    const { data: blockRainfallStats } = useLocationRainfall(
        filters?.type === 'Rainfall' && drillLevel !== 'block' && filters?.district,
        filters,
        'block'
    );

    const activeBlockStats = (drillLevel === 'block') ? dynamicRainfallStats : (blockRainfallStats || {});

    const isDashboard = !filters?.type || filters?.type === '';
    const { data: gwreData, loading: gwreLoading } = { data: null, loading: false };
    const reprojectedGwreData = null;
    const { data: raingaugeStations, loading: raingaugeLoading } = useGeoJSONData('/Raingauge Stations.geojson', filters?.type === 'Rainfall');

    const { rechargeRecords, rechargeLoading } = useRechargeLoader(filters);

    // WMS Migration: We no longer fetch large GeoJSON payloads for canals and waterbodies.
    // They are rendered server-side via WMS.
    const canalLoading = false;
    const waterbodyLoading = false;


    const statsByDistrict = useRainfallStatsByDistrict(rainfallPoints);

    const mergedDistrictRainfall = useMemo(() => {
        if (filters?.type !== 'Rainfall') return {};
        return { ...districtRainfall, ...statsByDistrict };
    }, [districtRainfall, statsByDistrict, filters?.type]);

    const aggregatedRainfallPoints = useAggregatedRainfallPoints(rainfallPoints, blockBoundaryData, filters?.type === 'Rainfall');

    const stationRainfallPoints = useMemo(() => {
        if (!rainfallStations?.length || !rainfallStationRecords?.length) return [];
        const recordsByStation = rainfallStationRecords.reduce((acc, record) => {
            if (!acc[record.station]) acc[record.station] = [];
            acc[record.station].push(record);
            return acc;
        }, {});
        return rainfallStations.map(station => {
            const stationRecords = recordsByStation[station.id] || [];
            const totalRainfall = stationRecords.reduce((sum, r) => sum + (r.rainfall_mm || 0), 0);
            const latestRecord = stationRecords.length > 0
                ? stationRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                : null;
            return {
                id: `station-${station.id}`,
                station_id: station.id,
                station_name: station.name,
                station_district: station.district,
                latitude: station.latitude,
                longitude: station.longitude,
                rainfall_mm: latestRecord ? latestRecord.rainfall_mm : 0,
                date: latestRecord ? latestRecord.date : null,
                total_rainfall: totalRainfall,
                record_count: stationRecords.length,
                type: 'rainfall_station'
            };
        });
    }, [rainfallStations, rainfallStationRecords]);

    const damMarkers = useDamMarkers((filters?.type === 'Water Resources') || isDashboard, RAJASTHAN_DAMS_DATA, blockBoundaryData, filters?.district, filters?.block);

    // Fetch the boundary geometry for the currently selected unit (District/Block/GP/Village)
    // for exact camera centering and zoom operations.
    const { boundary: selectedSelectionBoundary } = useSelectedBoundaryGeometry(filters);

    const filteredBlockData = useFilteredBlockData(blockBoundaryData, reprojectedGwreData, filters, rajasthanData, legendFeature);
    const validatedBlockData = useValidatedBlockData(filteredBlockData, filters, activeBlockStats, mergedDistrictRainfall, legendFeature);

    // Zooming & High-precision Boundaries
    const selectedDistrictData = useSelectedDistrictData(rajasthanData, filters?.district, selectedSelectionBoundary, blockBoundaryData, isLoading);
    const selectedBoundary = useValidatedBoundaries(selectedSelectionBoundary, filters, dynamicRainfallStats, drillLevel, legendFeature, stationRainfallPoints);

    return {
        districtRainfall: mergedDistrictRainfall, districtRainfallLoading,
        dynamicRainfallStats, dynamicRainfallLoading,
        piezometerRecords, piezometersLoading,
        reprojectedGwreData,
        gwreLoading,
        raingaugeStations, raingaugeLoading,
        aggregatedRainfallPoints, stationRainfallPoints,
        damMarkers,
        canalLoading,
        waterbodyLoading,
        rechargeRecords,
        rechargeLoading,
        validatedBlockData,
        selectedDistrictData,
        selectedBoundary,
        // Raw WFS feature used directly by useMapCamera for zoom — bypasses
        // useValidatedBoundaries which drops single-Feature (non-collection) responses.
        wfsBoundary: selectedSelectionBoundary
    };
};
