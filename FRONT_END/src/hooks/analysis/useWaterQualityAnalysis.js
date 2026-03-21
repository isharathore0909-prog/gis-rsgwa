import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';
import {
    DISTRICT_QUALITY_DATA,
    getBlockWaterQuality,
    getDistrictWaterQuality,
    checkWaterQualityStatus,
    calculateWQI
} from '../../data/blockWaterQualityData';

export const useWaterQualityAnalysis = ({
    isWaterQuality,
    globalFilters,
    displayRegion,
    displayBlock,
    neighbor
}) => {
    const [waterQualityStats, setWaterQualityStats] = useState(null);
    const [waterQualityAvailability, setWaterQualityAvailability] = useState(null);
    const [waterQualityLoading, setWaterQualityLoading] = useState(true);
    const [waterQualityError, setWaterQualityError] = useState(null);
    const lastWQParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });

    // Sync loading state to filter changes during render phase to avoid "No Data" flash
    if (isWaterQuality && (
        lastWQParams.current.displayRegion !== displayRegion ||
        lastWQParams.current.displayBlock !== displayBlock ||
        lastWQParams.current.gp !== globalFilters?.gramPanchayat ||
        lastWQParams.current.v !== globalFilters?.village
    )) {
        if (!waterQualityLoading) {
            setWaterQualityLoading(true);
            setWaterQualityStats(null);
            setWaterQualityAvailability(null);
        }
        lastWQParams.current = { displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village };
    }

    const qualityData = useMemo(() => {
        if (waterQualityStats?.summary) {
            const s = waterQualityStats.summary;
            const total = s.total_records || 1;
            const getPct = (val) => Math.round(((val || 0) / total) * 100);

            return [
                { subject: 'E.C.', value: getPct(s.ec_exceedance), label: '> 3000 µS/cm' },
                { subject: 'Fluoride', value: getPct(s.fluoride_exceedance), label: '> 1.5 mg/l' },
                { subject: 'Nitrate', value: getPct(s.nitrate_exceedance), label: '> 45 mg/l' },
                { subject: 'Hardness', value: getPct(s.hardness_exceedance), label: '> 600 mg/l' },
                { subject: 'Iron', value: getPct(s.iron_exceedance), label: '> 1.0 mg/l' },
                { subject: 'Arsenic', value: getPct(s.arsenic_exceedance), label: '> 0.01 mg/l' },
                { subject: 'Uranium', value: getPct(s.uranium_exceedance), label: '> 30 ppb' },
                { subject: 'TDS', value: getPct(s.tds_exceedance), label: '> 2000 mg/l' }
            ].filter(d => d.value > 0 || ['E.C.', 'Fluoride', 'Nitrate'].includes(d.subject));
        }

        if (displayRegion && DISTRICT_QUALITY_DATA[displayRegion]) {
            const q = DISTRICT_QUALITY_DATA[displayRegion];
            return [
                { subject: 'E.C.', value: q.ec_exceedance || q.ec || 0, label: '> 3000 µS/cm' },
                { subject: 'Fluoride', value: q.fluoride_exceedance || q.fluoride || 0, label: '> 1.5 mg/l' },
                { subject: 'Nitrate', value: q.nitrate_exceedance || q.nitrate || 0, label: '> 45 mg/l' },
                { subject: 'Hardness', value: q.hardness_exceedance || q.hardness || 0, label: '> 600 mg/l' },
                { subject: 'Iron', value: q.iron_exceedance || q.iron || 0, label: '> 1.0 mg/l' },
                { subject: 'Arsenic', value: q.arsenic_exceedance || q.arsenic || 0, label: '> 0.01 mg/l' }
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
    }, [displayRegion, waterQualityStats]);

    useEffect(() => {
        let ignore = false;
        if (!isWaterQuality) {
            setWaterQualityStats(null);
            return;
        }

        const fetchWaterQuality = async () => {
            setWaterQualityLoading(true);
            setWaterQualityError(null);
            try {
                const params = {};
                if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
                else if (displayRegion) params.district = displayRegion;

                if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
                else if (displayBlock) params.block = displayBlock;

                if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
                else if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                if (globalFilters?.village_id) params.village_id = globalFilters.village_id;
                else if (globalFilters?.village) params.village_name = globalFilters.village;

                if (neighbor?.type === 'water_quality_well' && neighbor.well_id) {
                    params.well_id = neighbor.well_id;
                }

                const [stats, availability] = await Promise.all([
                    api.waterQuality.getStatistics(params),
                    api.waterQuality.getAvailabilityStatistics(params).catch(() => null)
                ]);

                if (!ignore) {
                    setWaterQualityStats(stats);
                    setWaterQualityAvailability(availability || null);
                }
            } catch (error) {
                if (!ignore) {
                    console.error('Error fetching water quality data:', error);
                    setWaterQualityError(error.message);
                    setWaterQualityStats(null);
                }
            } finally {
                if (!ignore) {
                    setWaterQualityLoading(false);
                }
            }
        };

        fetchWaterQuality();
        return () => { ignore = true; };
    }, [isWaterQuality, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, neighbor?.well_id]);

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

        if (isWaterQuality && waterQualityStats?.summary && waterQualityStats.summary.total_records > 0) {
            const summary = waterQualityStats.summary;
            const regionName = displayRegion || 'Rajasthan';
            const bData = {
                district: regionName,
                block: displayBlock || (displayRegion ? regionName : 'State Average'),
                ec: summary.avg_ec || 0,
                fluoride: summary.avg_fluoride || 0,
                nitrate: summary.avg_nitrate || 0,
                tds: summary.avg_tds || 0,
                ph: summary.avg_ph || 0,
                hardness: summary.avg_hardness || 0,
                alkalinity: summary.avg_alkalinity || 0,
                chloride: summary.avg_chloride || 0,
                iron: summary.avg_iron || 0,
                arsenic: summary.avg_arsenic || 0,
                uranium: summary.avg_uranium || 0,
            };

            return {
                ...bData,
                status: waterQualityStats.status || checkWaterQualityStatus(bData),
                wqi: waterQualityStats.wqi || calculateWQI(bData)
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

    return {
        waterQualityStats,
        waterQualityAvailability,
        waterQualityLoading,
        waterQualityError,
        qualityData,
        blockWaterQualityData
    };
};
