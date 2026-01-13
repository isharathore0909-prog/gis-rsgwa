import { useState, useMemo, useEffect } from 'react';
import api from '../api';
import {
    DISTRICT_QUALITY_DATA,
    DISTRICT_WATER_LEVEL_DATA
} from '../data/districtAquiferData';
import {
    getBlockWaterQuality,
    getDistrictWaterQuality,
    checkWaterQualityStatus,
    calculateWQI
} from '../data/blockWaterQualityData';
import { getAquiferColor } from '../constants/mapConstants';

/**
 * useDataAnalysis Hook
 * 
 * Centralizes data fetching and processing for the DataAnalysisSidebar.
 */
export const useDataAnalysis = ({
    globalFilters,
    clickedLocation,
    neighbors,
    blockData,
    rainfallPoints = []
}) => {
    // -------------------------------------------------------------------------
    // 1. Basic Derived Flags & Location Info
    // -------------------------------------------------------------------------
    const isGWRE = globalFilters?.type === 'Ground Water Resource Estimation';
    const isRainfall = globalFilters?.type === 'Rainfall';
    const isWaterQuality = globalFilters?.type === 'Water Quality';
    const isAquifer = globalFilters?.type === 'Aquifer';
    const isWellInventory = globalFilters?.type === 'Well Inventory';
    const isRechargeStructure = globalFilters?.type === 'Recharge Structure';
    const isDistrictOnly = isRainfall;

    const filterDistrict = globalFilters?.district;
    const filterBlock = globalFilters?.block || globalFilters?.taluka;
    const neighbor = neighbors && neighbors.length > 0 ? neighbors[0] : null;
    const clickedDistrict = neighbor?.district;
    const clickedBlock = neighbor?.id || neighbor?.location;

    const displayRegion = clickedDistrict || filterDistrict || neighbor?.location || null;
    const displayBlock = clickedBlock || filterBlock;

    const getAnalysisContext = () => {
        if (globalFilters?.village) return { level: 'Village', name: globalFilters.village };
        if (globalFilters?.gramPanchayat) return { level: 'Gram Panchayat', name: globalFilters.gramPanchayat };
        if (globalFilters?.block) return { level: 'Block', name: globalFilters.block };
        if (globalFilters?.district) return { level: 'District', name: globalFilters.district };
        return { level: 'State', name: 'Rajasthan' };
    };

    const { level: analysisLevel, name: analysisName } = getAnalysisContext();

    // -------------------------------------------------------------------------
    // 2. GWRE Processing
    // -------------------------------------------------------------------------
    const pieData = useMemo(() => {
        if (!blockData || !blockData.features) {
            return [
                { name: 'Over Exploited', value: 35, color: '#e63946' },
                { name: 'Saline', value: 10, color: '#457b9d' },
                { name: 'Critical', value: 15, color: '#f4a261' },
                { name: 'Semi Critical', value: 20, color: '#e9c46a' },
                { name: 'Safe', value: 20, color: '#2a9d8f' }
            ];
        }

        const counts = {
            'over exploited': 0, 'saline': 0, 'critical': 0, 'semi critical': 0, 'safe': 0
        };

        const features = globalFilters?.district
            ? blockData.features.filter(f => {
                const matchDistrict = (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === globalFilters.district.toUpperCase();
                const matchTaluka = isDistrictOnly || !filterBlock || (f.properties.BLOCK_NAME || f.properties.Block)?.toUpperCase() === filterBlock.toUpperCase();
                return matchDistrict && matchTaluka;
            })
            : blockData.features;

        features.forEach(f => {
            const status = (f.properties.Category || f.properties.GWDL || f.properties.CATEGORY)?.trim().toLowerCase();
            if (counts.hasOwnProperty(status)) {
                counts[status]++;
            }
        });

        const result = [
            { name: 'Over Exploited', value: counts['over exploited'], color: '#e63946' },
            { name: 'Saline', value: counts['saline'], color: '#457b9d' },
            { name: 'Critical', value: counts['critical'], color: '#f4a261' },
            { name: 'Semi Critical', value: counts['semi critical'], color: '#e9c46a' },
            { name: 'Safe', value: counts['safe'], color: '#2a9d8f' }
        ].filter(d => d.value > 0);

        return result.length > 0 ? result : [{ name: 'Data N/A', value: 1, color: '#e2e8f0' }];
    }, [blockData, globalFilters, isDistrictOnly, filterBlock]);

    const totalBlocks = useMemo(() => {
        if (!blockData || !blockData.features) return 0;

        const features = globalFilters?.district
            ? blockData.features.filter(f => {
                const matchDistrict = (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === globalFilters.district.toUpperCase();
                const matchTaluka = isDistrictOnly || !filterBlock || (f.properties.BLOCK_NAME || f.properties.Block)?.toUpperCase() === filterBlock.toUpperCase();
                return matchDistrict && matchTaluka;
            })
            : blockData.features;

        return features.length;
    }, [blockData, globalFilters, isDistrictOnly, filterBlock]);

    const waterLevelChartData = useMemo(() => {
        if (displayRegion && DISTRICT_WATER_LEVEL_DATA[displayRegion]) {
            const d = DISTRICT_WATER_LEVEL_DATA[displayRegion];
            return [
                { name: 'Pre-Monsoon', value: d.pre, color: '#f4a261' },
                { name: 'Post-Monsoon', value: d.post, color: '#2a9d8f' },
                { name: 'Long Term Avg', value: d.longTerm, color: '#457b9d' }
            ];
        }

        const values = Object.values(DISTRICT_WATER_LEVEL_DATA);
        if (values.length === 0) return [];

        const sum = values.reduce((acc, curr) => ({
            pre: acc.pre + curr.pre,
            post: acc.post + curr.post,
            longTerm: acc.longTerm + curr.longTerm
        }), { pre: 0, post: 0, longTerm: 0 });

        const count = values.length;
        return [
            { name: 'State Avg (Pre)', value: parseFloat((sum.pre / count).toFixed(2)), color: '#f4a261' },
            { name: 'State Avg (Post)', value: parseFloat((sum.post / count).toFixed(2)), color: '#2a9d8f' },
            { name: 'Long Term (Avg)', value: parseFloat((sum.longTerm / count).toFixed(2)), color: '#457b9d' }
        ];
    }, [displayRegion]);

    // -------------------------------------------------------------------------
    // 3. Water Quality (DB + Static Fallback)
    // -------------------------------------------------------------------------
    const [waterQualityStats, setWaterQualityStats] = useState(null);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const [waterQualityError, setWaterQualityError] = useState(null);

    const qualityData = useMemo(() => {
        if (displayRegion && DISTRICT_QUALITY_DATA[displayRegion]) {
            const q = DISTRICT_QUALITY_DATA[displayRegion];
            return [
                { subject: 'E.C.', value: q.ec, label: '> 3000 µS/cm' },
                { subject: 'Fluoride', value: q.fluoride, label: '> 1.5 mg/l' },
                { subject: 'Nitrate', value: q.nitrate, label: '> 45 mg/l' },
                { subject: 'Iron', value: q.iron, label: '> 1.0 mg/l' },
                { subject: 'Arsenic', value: q.arsenic, label: '> 0.01 mg/l' },
                { subject: 'Uranium', value: q.uranium, label: '> 30 ppb' }
            ];
        }

        const values = Object.values(DISTRICT_QUALITY_DATA);
        if (values.length === 0) return [];

        const sum = values.reduce((acc, curr) => ({
            ec: acc.ec + curr.ec,
            fluoride: acc.fluoride + curr.fluoride,
            nitrate: acc.nitrate + curr.nitrate,
            iron: acc.iron + curr.iron,
            arsenic: acc.arsenic + curr.arsenic,
            uranium: acc.uranium + curr.uranium
        }), { ec: 0, fluoride: 0, nitrate: 0, iron: 0, arsenic: 0, uranium: 0 });

        const count = values.length;
        return [
            { subject: 'E.C.', value: Math.round(sum.ec / count), label: '> 3000 µS/cm' },
            { subject: 'Fluoride', value: Math.round(sum.fluoride / count), label: '> 1.5 mg/l' },
            { subject: 'Nitrate', value: Math.round(sum.nitrate / count), label: '> 45 mg/l' },
            { subject: 'Iron', value: Math.round(sum.iron / count), label: '> 1.0 mg/l' },
            { subject: 'Arsenic', value: Math.round(sum.arsenic / count), label: '> 0.01 mg/l' },
            { subject: 'Uranium', value: Math.round(sum.uranium / count), label: '> 30 ppb' }
        ];
    }, [displayRegion]);

    useEffect(() => {
        if (!isWaterQuality) {
            setWaterQualityStats(null);
            return;
        }

        const fetchWaterQuality = async () => {
            setWaterQualityLoading(true);
            setWaterQualityError(null);
            try {
                const params = {};
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;

                const data = await api.waterQuality.getStatistics(params);
                setWaterQualityStats(data.summary || null);
            } catch (error) {
                console.error('Error fetching water quality data:', error);
                setWaterQualityError(error.message);
                setWaterQualityStats(null);
            } finally {
                setWaterQualityLoading(false);
            }
        };

        fetchWaterQuality();
    }, [isWaterQuality, displayRegion, displayBlock]);

    const blockWaterQualityData = useMemo(() => {
        if (isWaterQuality && neighbor?.type === 'water_quality_well') {
            const wellData = {
                ...neighbor,
                block: neighbor.block || displayBlock || displayRegion,
                district: neighbor.district || displayRegion,
                chloride: 0, iron: 0, arsenic: 0, uranium: 0,
            };
            return {
                ...wellData,
                status: checkWaterQualityStatus(wellData),
                wqi: calculateWQI(wellData)
            };
        }

        if (isWaterQuality && waterQualityStats && waterQualityStats.total_records > 0) {
            const regionName = displayRegion || 'Rajasthan';
            const bData = {
                district: regionName,
                block: displayBlock || (displayRegion ? regionName : 'State Average'),
                ec: waterQualityStats.avg_ec || 0,
                fluoride: waterQualityStats.avg_fluoride || 0,
                nitrate: waterQualityStats.avg_nitrate || 0,
                tds: waterQualityStats.avg_tds || 0,
                ph: waterQualityStats.avg_ph || 0,
                hardness: waterQualityStats.avg_hardness || 0,
                alkalinity: waterQualityStats.avg_alkalinity || 0,
                chloride: 0, iron: 0, arsenic: 0, uranium: 0,
            };

            return {
                ...bData,
                status: checkWaterQualityStatus(bData),
                wqi: calculateWQI(bData)
            };
        }

        if (!displayRegion) return null;

        let normalizedRegion = displayRegion;
        if (normalizedRegion.includes('Ganganagar')) normalizedRegion = 'Ganganagar';

        if (displayBlock) {
            const bData = getBlockWaterQuality(normalizedRegion, displayBlock);
            if (bData) {
                return {
                    ...bData,
                    status: checkWaterQualityStatus(bData),
                    wqi: calculateWQI(bData)
                };
            }
            return { isNoData: true, block: displayBlock };
        } else {
            return getDistrictWaterQuality(normalizedRegion);
        }
    }, [displayRegion, displayBlock, isWaterQuality, waterQualityStats, neighbor]);

    // -------------------------------------------------------------------------
    // 4. Aquifer Data
    // -------------------------------------------------------------------------
    const [aquiferStats, setAquiferStats] = useState(null);
    const [aquiferLoading, setAquiferLoading] = useState(false);
    const [aquiferGeoJson, setAquiferGeoJson] = useState(null);

    useEffect(() => {
        if ((isAquifer || isGWRE) && !aquiferGeoJson) {
            fetch('/data/aquifer_opt.json')
                .then(res => res.json())
                .then(data => setAquiferGeoJson(data))
                .catch(err => console.error("Failed to load aquifer GeoJSON:", err));
        }
    }, [isAquifer, isGWRE, aquiferGeoJson]);

    useEffect(() => {
        const showAquiferData = isAquifer || isGWRE || (!isRainfall && !isWaterQuality && !isWellInventory && !isRechargeStructure);
        if (!showAquiferData) {
            setAquiferStats(null);
            return;
        }

        const fetchAquiferData = async () => {
            setAquiferLoading(true);
            try {
                const params = {};
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                const data = await api.aquifer.getStatistics(params);
                setAquiferStats(data);
            } catch (error) {
                console.error('Error fetching aquifer data:', error);
                setAquiferStats(null);
            } finally {
                setAquiferLoading(false);
            }
        };

        fetchAquiferData();
    }, [isAquifer, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, isGWRE, isRainfall, isWaterQuality, isWellInventory, isRechargeStructure]);

    const aquiferData = useMemo(() => {
        if (displayRegion && aquiferGeoJson && aquiferGeoJson.features) {
            const targetDist = displayRegion.toUpperCase().trim();
            const districtFeatures = aquiferGeoJson.features.filter(f => {
                const dName = f.properties.New_Dist || f.properties.District;
                return dName && dName.toUpperCase().trim() === targetDist;
            });

            if (districtFeatures.length > 0) {
                const counts = {};
                districtFeatures.forEach(f => {
                    const type = f.properties.Aquifer || f.properties.aquifer || "Unknown";
                    counts[type] = (counts[type] || 0) + 1;
                });
                const total = districtFeatures.length;
                return Object.entries(counts)
                    .map(([name, count]) => ({
                        name,
                        value: count,
                        percent: Math.round((count / total) * 100),
                        color: getAquiferColor(name)
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);
            }
        }

        if (aquiferStats && aquiferStats.aquifer_distribution && aquiferStats.aquifer_distribution.length > 0) {
            const totalWells = aquiferStats.summary.total_wells || 1;
            return aquiferStats.aquifer_distribution
                .map((aq) => ({
                    name: aq.aquifer || 'Unknown',
                    value: aq.count,
                    percent: Math.round((aq.count / totalWells) * 100),
                    color: getAquiferColor(aq.aquifer)
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
        }

        return [];
    }, [aquiferStats, aquiferGeoJson, displayRegion]);

    // -------------------------------------------------------------------------
    // 5. Rainfall Data
    // -------------------------------------------------------------------------
    const [rainfallStatsData, setRainfallStatsData] = useState(null);
    const [rainfallSummaryData, setRainfallSummaryData] = useState([]);
    const [rainfallError, setRainfallError] = useState(null);
    const [rainfallLoading, setRainfallLoading] = useState(false);

    useEffect(() => {
        if (!isRainfall) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setRainfallError(null);
            return;
        }

        const fetchRainfallStats = async () => {
            setRainfallLoading(true);
            setRainfallError(null);
            try {
                const hasClickedLocation = clickedLocation && clickedLocation.lat && clickedLocation.lng;
                if (hasClickedLocation && globalFilters?.gramPanchayat) {
                    const nearbyParams = {
                        lat: clickedLocation.lat,
                        lon: clickedLocation.lng,
                        gram_panchayat: globalFilters.gramPanchayat,
                        radius_km: 10,
                        timestep: globalFilters?.timestep || 'monthly'
                    };
                    if (globalFilters?.dataRangeStart) nearbyParams.start_date = globalFilters.dataRangeStart;
                    if (globalFilters?.dataRangeEnd) nearbyParams.end_date = globalFilters.dataRangeEnd;

                    const nearbyData = await api.rainfall.getNearby(nearbyParams);
                    if (nearbyData.stats) {
                        setRainfallStatsData({
                            ...nearbyData.stats,
                            maxVillage: nearbyData.stats.max_village,
                            maxDate: nearbyData.stats.max_date,
                            isNearbyData: true
                        });
                        setRainfallSummaryData(nearbyData.summary || []);
                    }
                } else {
                    const baseParams = {};
                    if (displayRegion) baseParams.district = displayRegion;
                    if (displayBlock) baseParams.block = displayBlock;
                    if (globalFilters?.gramPanchayat) baseParams.gram_panchayat = globalFilters.gramPanchayat;
                    if (globalFilters?.village) baseParams.village = globalFilters.village;
                    if (globalFilters?.dataRangeStart) baseParams.start_date = globalFilters.dataRangeStart;
                    if (globalFilters?.dataRangeEnd) baseParams.end_date = globalFilters.dataRangeEnd;

                    const stats = await api.rainfall.getStatistics(baseParams);
                    setRainfallStatsData({
                        ...stats,
                        maxVillage: stats.max_village,
                        maxDate: stats.max_date
                    });

                    const summaryParams = { ...baseParams, timestep: globalFilters?.timestep || 'monthly' };
                    const summary = await api.rainfall.getSummary(summaryParams);
                    setRainfallSummaryData(summary);
                }
            } catch (error) {
                console.error('Error fetching rainfall stats:', error);
                setRainfallError(error.message);
            } finally {
                setRainfallLoading(false);
            }
        };

        fetchRainfallStats();
    }, [isRainfall, displayRegion, displayBlock, globalFilters, clickedLocation]);

    const rainfallStatsMemo = useMemo(() => {
        if (rainfallStatsData) return { ...rainfallStatsData, chartData: rainfallSummaryData };
        if (!isRainfall || !rainfallPoints.length) return null;

        const getRain = (r) => r.rainfall_mm || r.rainfall_in_mm || 0;
        const getDate = (r) => r.date || r.rainfall_date;
        const total = rainfallPoints.reduce((acc, curr) => acc + getRain(curr), 0);
        const avg = total / rainfallPoints.length;
        const maxRecord = [...rainfallPoints].sort((a, b) => getRain(b) - getRain(a))[0];

        const groupedByDate = rainfallPoints.reduce((acc, curr) => {
            const d = getDate(curr);
            if (!acc[d]) acc[d] = { date: d, total: 0, count: 0 };
            acc[d].total += getRain(curr);
            acc[d].count += 1;
            return acc;
        }, {});

        return {
            total: total.toFixed(2),
            avg: avg.toFixed(2),
            max: getRain(maxRecord),
            maxVillage: maxRecord.village_name || maxRecord.village,
            maxDate: getDate(maxRecord),
            count: rainfallPoints.length,
            chartData: Object.values(groupedByDate).sort((a, b) => new Date(a.date) - new Date(b.date))
        };
    }, [rainfallStatsData, rainfallSummaryData, isRainfall, rainfallPoints]);

    // -------------------------------------------------------------------------
    // 6. Recharge Structure
    // -------------------------------------------------------------------------
    const [rechargeStats, setRechargeStats] = useState(null);
    const [rechargeLoading, setRechargeLoading] = useState(false);

    useEffect(() => {
        if (!isRechargeStructure) {
            setRechargeStats(null);
            return;
        }

        const fetchRechargeStats = async () => {
            setRechargeLoading(true);
            try {
                const params = {};
                if (analysisLevel === 'District') params.district = analysisName;
                else if (analysisLevel === 'Block') params.block = analysisName;
                else if (analysisLevel === 'State') params.state = analysisName;
                else if (analysisLevel === 'Village') params.village_name = analysisName;
                else if (analysisLevel === 'Gram Panchayat') params.gp_name = analysisName;

                const data = await api.rechargeStructure.getStatistics(params);
                setRechargeStats(data);
            } catch (error) {
                console.error('Error fetching recharge stats:', error);
                setRechargeStats(null);
            } finally {
                setRechargeLoading(false);
            }
        };

        fetchRechargeStats();
    }, [isRechargeStructure, analysisLevel, analysisName]);

    return {
        // Flags
        isGWRE, isRainfall, isWaterQuality, isAquifer, isWellInventory, isRechargeStructure,
        // Context
        displayRegion, displayBlock, analysisLevel, analysisName, neighbor,
        // GWRE
        pieData, totalBlocks, waterLevelChartData,
        // Water Quality
        qualityData, blockWaterQualityData, waterQualityLoading, waterQualityStats, waterQualityError,
        // Aquifer
        aquiferData, aquiferLoading,
        // Rainfall
        rainfallStats: rainfallStatsMemo, rainfallSummaryData, rainfallLoading, rainfallError,
        // Recharge
        rechargeStats, rechargeLoading
    };
};
