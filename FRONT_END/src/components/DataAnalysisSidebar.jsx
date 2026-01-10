import React, { useState, useMemo, useEffect } from 'react';

// Styles
import './DataAnalysisSidebar.css';

// Sub-components
import AnalysisHeader from './DataAnalysis/AnalysisHeader';
import RainfallSection from './DataAnalysis/RainfallSection';
import WaterQualitySection from './DataAnalysis/WaterQualitySection';
import GroundWaterSection from './DataAnalysis/GroundWaterSection';
import AquiferSection from './DataAnalysis/AquiferSection';
import WellInventorySection from './DataAnalysis/WellInventorySection';
import RechargeStructureSection from './DataAnalysis/RechargeStructureSection';
import AnalysisCard from './DataAnalysis/Common/AnalysisCard';

// Recharts imports removed (unused in this file)

// Data
import {
    AQUIFER_DATA,
    DISTRICT_QUALITY_DATA,
    DISTRICT_WATER_LEVEL_DATA
} from '../data/districtAquiferData';

import {
    getBlockWaterQuality,
    getDistrictWaterQuality,
    checkWaterQualityStatus,
    calculateWQI,
    getParameterColor
} from '../data/blockWaterQualityData';

import api from '../api';

/**
 * DataAnalysisSidebar Component
 * 
 * Manages the right sidebar for data analysis across different layers:
 * - Ground Water Resource Estimation (GWRE)
 * - Rainfall Analysis
 * - Water Quality Analysis
 * - Aquifer Analysis
 */
const DataAnalysisSidebar = ({
    clickedLocation,
    neighbors,
    filters: globalFilters,
    blockData,
    rainfallPoints = [],
    isControlsSidebarCollapsed
}) => {
    // =================================================================================
    // 1. Initialization & Derived State
    // =================================================================================
    const isGWRE = globalFilters?.type === 'Ground Water Resource Estimation';
    const isRainfall = globalFilters?.type === 'Rainfall';
    const isWaterQuality = globalFilters?.type === 'Water Quality';
    const isAquifer = globalFilters?.type === 'Aquifer';
    const isWellInventory = globalFilters?.type === 'Well Inventory';
    const isRechargeStructure = globalFilters?.type === 'Recharge Structure';
    const isDistrictOnly = isGWRE || isRainfall; // Removed isWaterQuality to allow block support

    const filterDistrict = globalFilters?.district;
    const filterBlock = globalFilters?.block || globalFilters?.taluka;
    const neighbor = neighbors && neighbors.length > 0 ? neighbors[0] : null;
    const clickedDistrict = neighbor?.district;
    const clickedBlock = neighbor?.id || neighbor?.location;

    const displayRegion = clickedDistrict || filterDistrict || neighbor?.location || null;
    const displayBlock = clickedBlock || filterBlock;

    // =================================================================================
    // 2. Data Processing (GWRE)
    // =================================================================================

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
                const matchTaluka = isDistrictOnly || !globalFilters.taluka || (f.properties.BLOCK_NAME || f.properties.Block)?.toUpperCase() === globalFilters.taluka.toUpperCase();
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
    }, [blockData, globalFilters, isDistrictOnly]);

    const totalBlocks = useMemo(() => {
        if (!blockData || !blockData.features) return 0;

        const features = globalFilters?.district
            ? blockData.features.filter(f => {
                const matchDistrict = (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === globalFilters.district.toUpperCase();
                const matchTaluka = isDistrictOnly || !globalFilters.taluka || (f.properties.BLOCK_NAME || f.properties.Block)?.toUpperCase() === globalFilters.taluka.toUpperCase();
                return matchDistrict && matchTaluka;
            })
            : blockData.features;

        return features.length;
    }, [blockData, globalFilters, isDistrictOnly]);

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

    // Moved aquiferData definition down to access aquiferStats


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

    // =================================================================================
    // 3. Water Quality Data (From Database)
    // =================================================================================
    const [waterQualityStats, setWaterQualityStats] = useState(null);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const [waterQualityError, setWaterQualityError] = useState(null);

    const [aquiferStats, setAquiferStats] = useState(null);
    const [aquiferLoading, setAquiferLoading] = useState(false);

    // Fetch water quality data from database when filters change
    useEffect(() => {
        if (!isWaterQuality) {
            setWaterQualityStats(null);
            return;
        }

        const fetchWaterQuality = async () => {
            setWaterQualityLoading(true);
            setWaterQualityError(null);
            try {
                // Initial params (empty for state level)
                const params = {};

                // Only add district if we have a specific region selected
                if (displayRegion) {
                    params.district = displayRegion;
                }

                if (displayBlock) {
                    params.block = displayBlock;
                }

                // Use statistics endpoint for aggregated data
                const data = await api.waterQuality.getStatistics(params);
                console.log('Water Quality Sidebar Stats:', {
                    params,
                    data,
                    summary: data.summary,
                    hasRecords: data.summary?.total_records > 0
                });
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

    // Process water quality data for display
    const blockWaterQualityData = useMemo(() => {
        // If we have a specific well clicked from the map, show that well's data
        if (isWaterQuality && neighbor?.type === 'water_quality_well') {
            const wellData = {
                ...neighbor,
                block: neighbor.block || displayBlock || displayRegion,
                district: neighbor.district || displayRegion,
                chloride: 0, // Not available in database
                iron: 0, // Not available in database
                arsenic: 0, // Not available in database
                uranium: 0, // Not available in database
            };
            return {
                ...wellData,
                status: checkWaterQualityStatus(wellData),
                wqi: calculateWQI(wellData)
            };
        }

        // If we have database statistics, use them
        // This works for both district/block specific AND state level (if displayRegion is null)
        if (isWaterQuality && waterQualityStats && waterQualityStats.total_records > 0) {
            const regionName = displayRegion || 'Rajasthan';
            const blockData = {
                district: regionName,
                block: displayBlock || (displayRegion ? regionName : 'State Average'),
                ec: waterQualityStats.avg_ec || 0,
                fluoride: waterQualityStats.avg_fluoride || 0,
                nitrate: waterQualityStats.avg_nitrate || 0,
                tds: waterQualityStats.avg_tds || 0,
                ph: waterQualityStats.avg_ph || 0,
                hardness: waterQualityStats.avg_hardness || 0,
                alkalinity: waterQualityStats.avg_alkalinity || 0,
                chloride: 0, // Not available in database
                iron: 0, // Not available in database
                arsenic: 0, // Not available in database
                uranium: 0, // Not available in database
            };

            return {
                ...blockData,
                status: checkWaterQualityStatus(blockData),
                wqi: calculateWQI(blockData)
            };
        }

        // No data found in database for this region? Fallback to static data below.

        // If no displayRegion (State level) and no DB stats, just return null or empty to show placeholder
        if (!displayRegion) return null;

        // The UI will show 'Static Data' badge if correct prop is passed.

        // Fallback to static data if not in water quality mode or no database records
        // Handle District Name Aliases (e.g., Ganganagar)
        let normalizedRegion = displayRegion;
        if (normalizedRegion.includes('Ganganagar')) normalizedRegion = 'Ganganagar';

        if (displayBlock) {
            const blockData = getBlockWaterQuality(normalizedRegion, displayBlock);
            if (blockData) {
                return {
                    ...blockData,
                    status: checkWaterQualityStatus(blockData),
                    wqi: calculateWQI(blockData)
                };
            }
            return { isNoData: true, block: displayBlock };
        } else {
            return getDistrictWaterQuality(normalizedRegion);
        }
    }, [displayRegion, displayBlock, isWaterQuality, waterQualityStats, neighbor]);

    // =================================================================================
    // 4. Aquifer Data (From Database)
    // =================================================================================
    useEffect(() => {
        const showAquiferData = isAquifer || isGWRE || (!isRainfall && !isWaterQuality && !isWellInventory && !isRechargeStructure);

        if (!showAquiferData || !displayRegion) {
            setAquiferStats(null);
            return;
        }

        const fetchAquiferData = async () => {
            setAquiferLoading(true);
            try {
                const params = {
                    district: displayRegion,
                };

                if (displayBlock) {
                    params.block = displayBlock;
                }

                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                const data = await api.aquifer.getStatistics(params);
                console.log('Aquifer Sidebar Stats:', {
                    params,
                    data
                });
                setAquiferStats(data);
            } catch (error) {
                console.error('Error fetching aquifer data:', error);
                setAquiferStats(null);
            } finally {
                setAquiferLoading(false);
            }
        };

        fetchAquiferData();
    }, [isAquifer, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village]);

    // Process aquifer data for display
    const aquiferData = useMemo(() => {
        const colors = ['#f9c74f', '#90be6d', '#f9844a', '#4d908e', '#277da1', '#577590', '#f3722c'];

        // Priority: Database Data
        if (aquiferStats && aquiferStats.aquifer_distribution && aquiferStats.aquifer_distribution.length > 0) {
            const totalWells = aquiferStats.summary.total_wells || 1;
            return aquiferStats.aquifer_distribution.map((aq, i) => ({
                name: aq.aquifer || 'Unknown',
                value: aq.count,
                districts: 1, // Not relevant for single location view
                area: aq.count, // Using count as proxy for "area" or prevalence since we don't have area in DB
                percent: Math.round((aq.count / totalWells) * 100),
                color: colors[i % colors.length]
            }));
        }

        // Fallback: Static Data (only if not using DB or DB empty)
        let filteredAquifers = AQUIFER_DATA;

        if (displayRegion) {
            filteredAquifers = AQUIFER_DATA.filter(aq =>
                aq.districts.some(d => d.toUpperCase() === displayRegion.toUpperCase())
            );
        }

        return filteredAquifers
            .sort((a, b) => b.area - a.area)
            .slice(0, 10)
            .map((aq, i) => ({
                name: aq.type,
                value: aq.area,
                districts: aq.districts.length,
                area: aq.area.toLocaleString(),
                percent: aq.percent,
                color: colors[i % colors.length]
            }));
    }, [displayRegion, aquiferStats]);

    // =================================================================================
    // 4. Rainfall Data (From Database)
    // =================================================================================
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
                // Check if user clicked on a specific location (lat/lon)
                const hasClickedLocation = clickedLocation && clickedLocation.lat && clickedLocation.lng;

                if (hasClickedLocation && globalFilters?.gramPanchayat) {
                    // User clicked on map within a gram panchayat - use nearby endpoint
                    console.log('Fetching nearby rainfall data for clicked location:', clickedLocation);

                    const nearbyParams = {
                        lat: clickedLocation.lat,
                        lon: clickedLocation.lng,
                        gram_panchayat: globalFilters.gramPanchayat,
                        radius_km: 10, // 10km radius
                        timestep: globalFilters?.timestep || 'monthly'
                    };

                    if (globalFilters?.dataRangeStart) nearbyParams.start_date = globalFilters.dataRangeStart;
                    if (globalFilters?.dataRangeEnd) nearbyParams.end_date = globalFilters.dataRangeEnd;

                    const nearbyData = await api.rainfall.getNearby(nearbyParams);
                    console.log('Nearby Rainfall Response:', nearbyData);

                    if (nearbyData.stats) {
                        setRainfallStatsData({
                            ...nearbyData.stats,
                            maxVillage: nearbyData.stats.max_village,
                            maxDate: nearbyData.stats.max_date,
                            isNearbyData: true,
                            location: nearbyData.location,
                            radius_km: nearbyData.radius_km
                        });
                        setRainfallSummaryData(nearbyData.summary || []);
                    } else {
                        // No data found nearby
                        setRainfallStatsData(null);
                        setRainfallSummaryData([]);
                    }
                } else {
                    // Regular location-based query (district/block/GP/village)
                    const baseParams = {};

                    // Only add district if explicitly selected/filtered
                    if (displayRegion) {
                        baseParams.district = displayRegion;
                    }

                    if (displayBlock) baseParams.block = displayBlock;
                    if (globalFilters?.gramPanchayat) baseParams.gram_panchayat = globalFilters.gramPanchayat;
                    if (globalFilters?.village) baseParams.village = globalFilters.village;
                    if (globalFilters?.dataRangeStart) baseParams.start_date = globalFilters.dataRangeStart;
                    if (globalFilters?.dataRangeEnd) baseParams.end_date = globalFilters.dataRangeEnd;

                    console.log('Fetching Rainfall Stats with base params:', baseParams);

                    // 1. Fetch Statistics (Total, Avg, Max) - NO timestep param
                    const stats = await api.rainfall.getStatistics(baseParams);
                    console.log('Rainfall Statistics Response:', stats);
                    setRainfallStatsData({
                        ...stats,
                        maxVillage: stats.max_village,
                        maxDate: stats.max_date
                    });

                    // 2. Fetch Summary (Chart Data) - WITH timestep param
                    const summaryParams = {
                        ...baseParams,
                        timestep: globalFilters?.timestep || 'monthly'
                    };
                    console.log('Fetching Rainfall Summary with params:', summaryParams);
                    const summary = await api.rainfall.getSummary(summaryParams);
                    console.log('Rainfall Summary Response:', summary);
                    setRainfallSummaryData(summary);
                }

            } catch (error) {
                console.error('Error fetching rainfall stats:', error);
                setRainfallError(error.message || 'Failed to load rainfall statistics');
            } finally {
                setRainfallLoading(false);
            }
        };

        fetchRainfallStats();
    }, [isRainfall, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, globalFilters?.dataRangeStart, globalFilters?.dataRangeEnd, globalFilters?.timestep, clickedLocation]);


    // Legacy fallback processing (only if backend stats fail)
    const rainfallStats = useMemo(() => {
        if (rainfallStatsData) return {
            ...rainfallStatsData,
            chartData: rainfallSummaryData
        };

        if (!isRainfall || !rainfallPoints.length) return null;

        const getRain = (r) => r.rainfall_mm || r.rainfall_in_mm || 0;
        const getDate = (r) => r.date || r.rainfall_date;

        const total = rainfallPoints.reduce((acc, curr) => acc + getRain(curr), 0);
        const avg = total / rainfallPoints.length;
        const maxRecord = [...rainfallPoints].sort((a, b) => getRain(b) - getRain(a))[0];

        // Group by date for chart
        const groupedByDate = rainfallPoints.reduce((acc, curr) => {
            const d = getDate(curr);
            if (!acc[d]) acc[d] = { date: d, total: 0, count: 0 };
            acc[d].total += getRain(curr);
            acc[d].count += 1;
            return acc;
        }, {});

        const dailyChartData = Object.values(groupedByDate).sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            total: total.toFixed(2),
            avg: avg.toFixed(2),
            max: getRain(maxRecord),
            maxVillage: maxRecord.village_name || maxRecord.village,
            maxDate: getDate(maxRecord),
            count: rainfallPoints.length,
            chartData: dailyChartData
        };
    }, [isRainfall, rainfallPoints, rainfallStatsData, rainfallSummaryData]);

    // =================================================================================
    // 5. Analysis Context Helper
    // =================================================================================
    const getAnalysisContext = () => {
        if (globalFilters?.village) return { level: 'Village', name: globalFilters.village };
        if (globalFilters?.gramPanchayat) return { level: 'Gram Panchayat', name: globalFilters.gramPanchayat };
        if (globalFilters?.block) return { level: 'Block', name: globalFilters.block };
        if (globalFilters?.district) return { level: 'District', name: globalFilters.district };
        return { level: 'State', name: 'Rajasthan' };
    };

    const { level: analysisLevel, name: analysisName } = getAnalysisContext();

    // =================================================================================
    // 6. Recharge Structure Data
    // =================================================================================
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

                console.log('Fetching Recharge Stats with params:', params);
                const data = await api.rechargeStructure.getStatistics(params);
                console.log('Recharge Structure Sidebar Stats Result:', data);
                setRechargeStats(data);
            } catch (error) {
                console.error('Error fetching recharge stats:', error);
                setRechargeStats(null);
            } finally {
                setRechargeLoading(false);
            }
        };

        fetchRechargeStats();
    }, [isRechargeStructure, displayRegion, displayBlock, analysisLevel, analysisName]);

    // =================================================================================
    // 7. Component Render
    // =================================================================================
    return (
        <aside className={`data-analysis-sidebar ${isControlsSidebarCollapsed ? 'expanded-layout' : ''}`}>
            <div className="sidebar-content">

                <AnalysisHeader
                    displayRegion={analysisName}
                    analysisLevel={analysisLevel}
                    isRainfall={isRainfall}
                    selectedLayer={globalFilters?.type}
                />

                {isRainfall && (
                    <RainfallSection
                        displayRegion={analysisName}
                        analysisLevel={analysisLevel}
                        rainfallStats={rainfallStats}
                        rainfallPoints={rainfallSummaryData}
                        viewType={globalFilters?.timestep}
                        isLoading={rainfallLoading}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}

                {isWaterQuality && (
                    <WaterQualitySection
                        displayRegion={displayRegion || 'Rajasthan'}
                        selectedBlock={displayBlock}
                        blockWaterQualityData={blockWaterQualityData}
                        qualityData={qualityData}
                        isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                        isDatabaseData={waterQualityStats?.total_records > 0}
                    />
                )}

                {isRechargeStructure && (
                    <RechargeStructureSection
                        displayRegion={analysisName}
                        displayBlock={displayBlock}
                        stats={rechargeStats}
                        isLoading={rechargeLoading}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}

                {(isGWRE || (!isRainfall && !isWaterQuality && !isAquifer && !isWellInventory && !isRechargeStructure)) && (
                    <GroundWaterSection
                        isGWRE={isGWRE}
                        pieData={pieData}
                        totalBlocks={totalBlocks}
                        waterLevelChartData={waterLevelChartData}
                        aquiferData={aquiferData}
                        qualityData={qualityData}
                        blockWaterQualityData={blockWaterQualityData}
                        getParameterColor={getParameterColor}
                    />
                )}

                {isAquifer && (
                    <AquiferSection
                        displayRegion={displayRegion}
                        displayBlock={displayBlock}
                        data={aquiferData}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}

                {isWellInventory && (
                    <WellInventorySection
                        displayRegion={displayRegion}
                        displayBlock={displayBlock}
                        analysisLevel={analysisLevel}
                        globalFilters={globalFilters}
                        selectedWell={neighbor?.type === 'well_inventory_well' ? neighbor : null}
                        clickedLocation={clickedLocation}
                        isExpanded={isControlsSidebarCollapsed}
                    />
                )}
                {/* Debug Info */}
                {import.meta.env.DEV && (
                    <div style={{ fontSize: '10px', color: '#999', padding: '10px' }}>
                        Type: {globalFilters?.type} | Region: {displayRegion} | Block: {displayBlock}<br />
                        WQ DB Records: {waterQualityStats ? `${waterQualityStats.total_records}` : 'Loading/Null'}<br />
                        Recharge Stats: {rechargeStats ? `${rechargeStats.total_count} (of ${rechargeStats.total_available_in_db} total)` : (rechargeLoading ? 'Loading...' : 'Null')}<br />
                        Recharge DB Linkage: {rechargeStats ? `Vlg:${rechargeStats.debug?.with_village}, Dist:${rechargeStats.debug?.with_district} | VlgTable:${rechargeStats.debug?.village_table_size}` : 'N/A'}<br />
                        Sample RS VlgID: {rechargeStats ? rechargeStats.debug?.sample_rs_village_id : 'N/A'}<br />
                        Using WQ DB: {waterQualityStats?.total_records > 0 ? 'Yes' : 'No'}<br />
                        Rainfall Error: {rainfallError || 'None'}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default DataAnalysisSidebar;
