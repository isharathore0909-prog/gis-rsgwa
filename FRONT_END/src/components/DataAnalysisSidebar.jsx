import React, { useState, useMemo, useEffect } from 'react';

// Styles
import './DataAnalysisSidebar.css';

// Sub-components
import AnalysisHeader from './DataAnalysis/AnalysisHeader';
import RainfallSection from './DataAnalysis/RainfallSection';
import WaterQualitySection from './DataAnalysis/WaterQualitySection';
import GroundWaterSection from './DataAnalysis/GroundWaterSection';
import AquiferSection from './DataAnalysis/AquiferSection';
import AnalysisCard from './DataAnalysis/Common/AnalysisCard';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

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

import api from '../services/api';

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
    const isDistrictOnly = isGWRE || isRainfall; // Removed isWaterQuality to allow block support

    const filterDistrict = globalFilters?.district;
    const filterBlock = globalFilters?.block;
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
            const status = (f.properties.GWDL || f.properties.CATEGORY)?.trim().toLowerCase();
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

    const aquiferData = useMemo(() => {
        const colors = ['#f9c74f', '#90be6d', '#f9844a', '#4d908e', '#277da1', '#577590', '#f3722c'];
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
    }, [displayRegion]);

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
    const [waterQualityRecords, setWaterQualityRecords] = useState([]);
    const [waterQualityLoading, setWaterQualityLoading] = useState(false);
    const [waterQualityError, setWaterQualityError] = useState(null);

    // Fetch water quality data from database when filters change
    useEffect(() => {
        if (!isWaterQuality || !displayRegion) {
            setWaterQualityRecords([]);
            return;
        }

        const fetchWaterQuality = async () => {
            setWaterQualityLoading(true);
            setWaterQualityError(null);
            try {
                const params = {
                    district: displayRegion,
                };

                if (displayBlock) {
                    params.block = displayBlock;
                }

                const data = await api.waterQuality.getRecords(params);
                setWaterQualityRecords(data.results || data || []);
            } catch (error) {
                console.error('Error fetching water quality data:', error);
                setWaterQualityError(error.message);
                setWaterQualityRecords([]);
            } finally {
                setWaterQualityLoading(false);
            }
        };

        fetchWaterQuality();
    }, [isWaterQuality, displayRegion, displayBlock]);

    // Process water quality data for display
    const blockWaterQualityData = useMemo(() => {
        if (!displayRegion) return null;

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

        // If we have database records, use them (Aggregation)
        if (isWaterQuality && waterQualityRecords.length > 0) {
            // Calculate average values for the selected region/block
            const avgData = waterQualityRecords.reduce((acc, record) => {
                acc.ec += record.ec || 0;
                acc.fluoride += record.fluoride || 0;
                acc.nitrate += record.nitrate || 0;
                acc.tds += record.tds || 0;
                acc.ph += record.ph || 0;
                acc.hardness += record.hardness || 0;
                acc.alkalinity += record.alkalinity || 0;
                acc.count++;
                return acc;
            }, { ec: 0, fluoride: 0, nitrate: 0, tds: 0, ph: 0, hardness: 0, alkalinity: 0, count: 0 });

            if (avgData.count > 0) {
                const blockData = {
                    district: displayRegion,
                    block: displayBlock || displayRegion,
                    ec: avgData.ec / avgData.count,
                    fluoride: avgData.fluoride / avgData.count,
                    nitrate: avgData.nitrate / avgData.count,
                    tds: avgData.tds / avgData.count,
                    ph: avgData.ph / avgData.count,
                    hardness: avgData.hardness / avgData.count,
                    alkalinity: avgData.alkalinity / avgData.count,
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

            // No data found in database for this region
            return { isNoData: true, block: displayBlock || displayRegion };
        }

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
    }, [displayRegion, displayBlock, isWaterQuality, waterQualityRecords, neighbor]);

    // =================================================================================
    // 4. Data Processing (Rainfall - From Database)
    // =================================================================================
    const rainfallStats = useMemo(() => {
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
            maxVillage: maxRecord.village || maxRecord.village_name,
            maxDate: getDate(maxRecord),
            count: rainfallPoints.length,
            chartData: dailyChartData
        };
    }, [isRainfall, rainfallPoints]);

    // =================================================================================
    // 5. Component Render
    // =================================================================================
    return (
        <aside className={`data-analysis-sidebar ${isControlsSidebarCollapsed ? 'expanded-layout' : ''}`}>
            <div className="sidebar-content">

                <AnalysisHeader
                    displayRegion={displayRegion}
                    isRainfall={isRainfall}
                    selectedLayer={globalFilters?.type}
                />

                {isRainfall && (
                    <RainfallSection
                        displayRegion={displayRegion}
                        rainfallStats={rainfallStats}
                        rainfallPoints={rainfallPoints}
                        viewType={globalFilters?.timestep}
                    />
                )}

                {isWaterQuality && (
                    <WaterQualitySection
                        displayRegion={displayRegion}
                        selectedBlock={displayBlock}
                        blockWaterQualityData={blockWaterQualityData}
                        qualityData={qualityData}
                        isControlsSidebarCollapsed={isControlsSidebarCollapsed}
                    />
                )}

                {(isGWRE || (!isRainfall && !isWaterQuality && !isAquifer)) && (
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
                    />
                )}
            </div>
        </aside>
    );
};

export default DataAnalysisSidebar;
