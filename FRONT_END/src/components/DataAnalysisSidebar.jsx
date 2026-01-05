import React, { useState, useMemo } from 'react';

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
    getRainfallByDistrict,
    getMaxRainfallByDistrict,
    MONSOON_SUMMARY_2024,
    DIVISION_RAINFALL_DATA
} from '../data/rainfallData';

import {
    getBlockWaterQuality,
    getDistrictWaterQuality,
    checkWaterQualityStatus,
    calculateWQI,
    getParameterColor
} from '../data/blockWaterQualityData';

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
    isControlsSidebarCollapsed
}) => {
    // =================================================================================
    // 1. Initialization & Derived State
    // =================================================================================
    const isGWRE = globalFilters?.type === 'Ground Water Resource Estimation';
    const isRainfall = globalFilters?.type === 'Rainfall';
    const isWaterQuality = globalFilters?.type === 'Water Quality';
    const isAquifer = globalFilters?.type === 'Aquifer';
    const isDistrictOnly = isGWRE || isRainfall || isWaterQuality; // Removed isAquifer here because we want block support

    const filterDistrict = globalFilters?.district;
    const filterBlock = globalFilters?.block;
    const neighbor = neighbors && neighbors.length > 0 ? neighbors[0] : null;
    const clickedDistrict = neighbor?.district;
    const clickedBlock = neighbor?.id || neighbor?.location;

    const displayRegion = clickedDistrict || filterDistrict || neighbor?.location || null;
    const displayBlock = clickedBlock || filterBlock;

    // View State (Rainfall specifics)
    const [rainfallView, setRainfallView] = useState('state');

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

    const blockWaterQualityData = useMemo(() => {
        const selectedBlock = globalFilters?.block;
        if (displayRegion && selectedBlock) {
            const blockData = getBlockWaterQuality(displayRegion, selectedBlock);
            if (blockData) {
                return {
                    ...blockData,
                    status: checkWaterQualityStatus(blockData),
                    wqi: calculateWQI(blockData)
                };
            }
            return { isNoData: true, block: selectedBlock };
        } else if (displayRegion) {
            return getDistrictWaterQuality(displayRegion);
        }
        return null;
    }, [displayRegion, globalFilters]);

    // =================================================================================
    // 3. Data Processing (Rainfall)
    // =================================================================================

    const rainfallChartData = useMemo(() => {
        if (!isRainfall || !displayRegion) return [];
        const data = getRainfallByDistrict(displayRegion);
        return Object.keys(data)
            .filter(year => year !== 'DEFAULT')
            .map(year => ({ year, ...data[year] }));
    }, [isRainfall, displayRegion]);

    const rainfall2024Data = useMemo(() => {
        if (!isRainfall || !displayRegion) return null;
        const data = getRainfallByDistrict(displayRegion);
        const year2024 = data["2024"];
        if (!year2024 || !year2024.normal_monsoon) return null;

        return [
            { name: 'Normal Monsoon', value: year2024.normal_monsoon, color: '#94a3b8' },
            { name: 'Actual Monsoon', value: year2024.monsoon, color: '#2a9d8f' }
        ];
    }, [isRainfall, displayRegion]);

    const monthlyRainfallData = useMemo(() => {
        if (!isRainfall || !displayRegion) return [];
        const data = getRainfallByDistrict(displayRegion);
        const year2024 = data["2024"];
        if (!year2024 || !year2024.monthly) return [];

        return [
            { month: 'June', value: year2024.monthly.june },
            { month: 'July', value: year2024.monthly.july },
            { month: 'August', value: year2024.monthly.august },
            { month: 'September', value: year2024.monthly.september }
        ];
    }, [isRainfall, displayRegion]);

    const maxOneDayData = useMemo(() => {
        if (!isRainfall || !displayRegion) return [];
        return getMaxRainfallByDistrict(displayRegion);
    }, [isRainfall, displayRegion]);

    // =================================================================================
    // 4. Component Render
    // =================================================================================
    return (
        <aside className={`data-analysis-sidebar ${isControlsSidebarCollapsed ? 'expanded-layout' : ''}`}>
            <div className="sidebar-content">

                <AnalysisHeader displayRegion={displayRegion} isRainfall={isRainfall} />

                {isRainfall && (
                    <RainfallSection
                        view={rainfallView}
                        setView={setRainfallView}
                        displayRegion={displayRegion}
                        monsoonSummary={MONSOON_SUMMARY_2024}
                        divisionData={DIVISION_RAINFALL_DATA}
                        chartData={rainfallChartData}
                        perf2024={rainfall2024Data}
                        monthlyData={monthlyRainfallData}
                        maxOneDayData={maxOneDayData}
                    />
                )}

                {isWaterQuality && (
                    <WaterQualitySection
                        displayRegion={displayRegion}
                        selectedBlock={globalFilters?.block}
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
