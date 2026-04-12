import { useMemo } from 'react';
import {
    useDistrictRainfall,
    useWaterQuality,
    useAquiferData,
    usePiezometerData,
    useGeoJSONData,
    useRainfallStatsByBlock,
    useRainfallStatsByDistrict,
    useAggregatedRainfallPoints,
    useDamMarkers,
    useValidatedRajasthanData,
    useSelectedDistrictData,
    useFilteredBlockData,
    useValidatedBlockData,
    useValidatedBoundaries,
    useLocationRainfall,
    useSpatialLayerData
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

    const { data: gwreData, loading: gwreLoading } = useSpatialLayerData('groundwater_zone', filters?.type === 'Ground Water Resource Estimation', filters);
    const { data: canalData, loading: canalLoading } = useSpatialLayerData('canal', filters?.type === 'Water Resources' && filters?.showCanals, filters);
    const { data: waterbodyData, loading: waterbodyLoading } = useSpatialLayerData('waterbody', filters?.type === 'Water Resources' && filters?.showWaterbodies, filters);

    const { data: raingaugeStations, loading: raingaugeLoading } = useGeoJSONData('/Raingauge Stations.geojson', filters?.type === 'Rainfall');
    const reprojectedGwreData = useMemo(() => gwreData ? reprojectGeoJSON(gwreData) : null, [gwreData]);


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

    const damMarkers = useDamMarkers(filters?.type === 'Water Resources', RAJASTHAN_DAMS_DATA, blockBoundaryData, filters?.district, filters?.block);

    const validatedBoundaries = useValidatedBoundaries(dynamicBoundaries, filters, dynamicRainfallStats, drillLevel, legendFeature, stationRainfallPoints);
    const validatedRajasthanData = useValidatedRajasthanData(rajasthanData, filters, mergedDistrictRainfall, legendFeature);
    const selectedDistrictData = useSelectedDistrictData(rajasthanData, filters?.district, validatedBoundaries, blockBoundaryData, isLoading);
    const filteredBlockData = useFilteredBlockData(blockBoundaryData, reprojectedGwreData, filters, rajasthanData, legendFeature);
    const validatedBlockData = useValidatedBlockData(filteredBlockData, filters, activeBlockStats, mergedDistrictRainfall, legendFeature);

    return {
        districtRainfall, districtRainfallLoading,
        dynamicRainfallStats, dynamicRainfallLoading,
        piezometerRecords, piezometersLoading,
        reprojectedGwreData, gwreLoading,
        raingaugeStations, raingaugeLoading,
        aggregatedRainfallPoints, stationRainfallPoints,
        damMarkers,
        canalData, canalLoading,
        waterbodyData, waterbodyLoading,
        validatedBoundaries, validatedRajasthanData,
        selectedDistrictData, validatedBlockData
    };
};
