import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';
import {
    checkWaterQualityStatus,
    calculateWQI
} from '../../data/blockWaterQualityData';

export const useWaterQualityAnalysis = ({
    isWaterQuality,
    globalFilters,
    displayRegion,
    displayBlock,
    neighbor,
    rajasthanId,
    analysisLevel
}) => {
    const [waterQualityStats, setWaterQualityStats] = useState(null);
    const [waterQualityAvailability, setWaterQualityAvailability] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [waterQualityError, setWaterQualityError] = useState(null);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    const lastWQParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });
    const hasAttemptedFetch = useRef(false);

    const paramsChanged = isWaterQuality && (
        lastWQParams.current.displayRegion !== displayRegion ||
        lastWQParams.current.displayBlock !== displayBlock ||
        lastWQParams.current.gp !== globalFilters?.gramPanchayat ||
        lastWQParams.current.v !== globalFilters?.village
    );

    const isPendingInitialFetch = isWaterQuality && !hasAttemptedFetch.current;
    const waterQualityLoading = isFetching || paramsChanged || isPendingInitialFetch;

    // Sync params and clear data on change, loading state is handled deriving
    useEffect(() => {
        if (isWaterQuality && paramsChanged) {
            setWaterQualityStats(null);
            setWaterQualityAvailability(null);

            lastWQParams.current = { displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village };
            hasAttemptedFetch.current = false;
        }
    }, [isWaterQuality, paramsChanged, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village]);

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

        return [];
    }, [displayRegion, waterQualityStats]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!isWaterQuality) {
            hasAttemptedFetch.current = false;
            setIsFetching(false);
            return;
        }

        const fetchWaterQuality = async () => {
            if (!rajasthanId) {
                return;
            }
            hasAttemptedFetch.current = true;
            setIsFetching(true);
            setWaterQualityError(null);
            try {
                const params = {};
                if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
                else if (analysisLevel !== 'State' && displayRegion) params.district = displayRegion;

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
                    api.waterQuality.getStatistics(params, signal),
                    api.waterQuality.getAvailabilityStatistics(params, signal).catch(() => null)
                ]);

                if (!signal.aborted) {
                    setWaterQualityStats(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(stats)) return prev;
                        return stats;
                    });
                    setWaterQualityAvailability(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(availability)) return prev;
                        return availability || null;
                    });
                }
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'CanceledError') return;
                if (!signal.aborted) {
                    console.error('Error fetching water quality data:', error);
                    // If backend returned connection error, retry after a delay
                    if (apiRetryCount < 3 && (!error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!signal.aborted) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setWaterQualityError(error.message);
                        setWaterQualityStats(null);
                    }
                }
            } finally {
                if (!signal.aborted) {
                    setIsFetching(false);
                }
            }
        };

        fetchWaterQuality();
        return () => controller.abort();
    }, [isWaterQuality, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, neighbor?.well_id, rajasthanId, apiRetryCount]);

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

        if (waterQualityStats?.summary && waterQualityStats.summary.total_records > 0) {
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

        return { isNoData: true, block: displayBlock || displayRegion || 'Rajasthan' };
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
