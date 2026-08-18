import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';
import {
    checkWaterQualityStatus,
    calculateWQI
} from '../../data/blockWaterQualityData';
import { notificationService } from '../../services/notificationService';

/**
 * useWaterQualityAnalysis
 *
 * mode: 'idle'    — stop in-flight requests; retain existing state
 * mode: 'preview' — fetch statistics only (qualityData radar chart for preview card)
 * mode: 'detail'  — preview + availability statistics
 *
 * Data is cleared only when the filter signature changes, not on mode transitions.
 */
export const useWaterQualityAnalysis = ({
    // Legacy boolean kept for callers that haven't migrated yet
    isWaterQuality,
    // Explicit mode takes priority when provided
    mode: modeProp,
    globalFilters,
    displayRegion,
    displayBlock,
    neighbor,
    rajasthanId,
    analysisLevel
}) => {
    // Resolve effective mode
    const mode = modeProp ?? (isWaterQuality ? 'detail' : 'idle');

    // ── State ────────────────────────────────────────────────────────────────
    // Preview-tier
    const [waterQualityStats, setWaterQualityStats] = useState(null);
    // Detail-tier
    const [waterQualityAvailability, setWaterQualityAvailability] = useState(null);

    const [isFetching, setIsFetching] = useState(false);
    const [waterQualityError, setWaterQualityError] = useState(null);
    const [apiRetryCount, setApiRetryCount] = useState(0);

    // ── Filter signature ─────────────────────────────────────────────────────
    // Data is cleared ONLY when these values change, not when mode changes.
    const filterSig = JSON.stringify({
        district_id: globalFilters?.district_id,
        block_id: globalFilters?.block_id,
        gp_id: globalFilters?.gp_id,
        village_id: globalFilters?.village_id,
        region: displayRegion,
        block: displayBlock,
        gp: globalFilters?.gramPanchayat,
        village: globalFilters?.village,
        wellId: neighbor?.type === 'water_quality_well' ? neighbor?.well_id : undefined,
    });
    const lastFilterSig = useRef(filterSig);
    const hasAttemptedFetch = useRef(false);

    // Clear ALL state when filter signature changes
    useEffect(() => {
        if (filterSig !== lastFilterSig.current) {
            lastFilterSig.current = filterSig;
            hasAttemptedFetch.current = false;
            setWaterQualityStats(null);
            setWaterQualityAvailability(null);
            setWaterQualityError(null);
        }
    }, [filterSig]);

    // Clear detail-tier when mode drops out of detail (but filter sig unchanged)
    const prevMode = useRef(mode);
    useEffect(() => {
        if (prevMode.current === 'detail' && mode !== 'detail') {
            setWaterQualityAvailability(null);
        }
        prevMode.current = mode;
    }, [mode]);

    const shouldFetchPreview = mode === 'preview' || mode === 'detail';
    const shouldFetchDetail  = mode === 'detail';

    const isPendingInitialFetch = shouldFetchPreview && !hasAttemptedFetch.current;
    const waterQualityLoading = isFetching || isPendingInitialFetch;

    // ── Build params helper ──────────────────────────────────────────────────
    const buildParams = () => {
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
        return params;
    };

    // ── Effect 1: Statistics — fires in preview and detail ───────────────────
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetchPreview) {
            // idle — stop spinner, do NOT clear data
            setIsFetching(false);
            return () => controller.abort();
        }

        const fetchStats = async () => {
            hasAttemptedFetch.current = true;
            setIsFetching(true);
            setWaterQualityError(null);
            try {
                const params = buildParams();
                const stats = await api.waterQuality.getStatistics(params, signal);

                if (!signal.aborted) {
                    setWaterQualityStats(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(stats)) return prev;
                        return stats;
                    });
                }
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'CanceledError') return;
                if (!signal.aborted) {
                    console.error('Error fetching water quality stats:', error);
                    if (apiRetryCount < 3 && (!error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
                        const delay = 5000 * (apiRetryCount + 1);
                        setTimeout(() => {
                            if (!signal.aborted) setApiRetryCount(prev => prev + 1);
                        }, delay);
                    } else {
                        setWaterQualityError(error.message);
                        setWaterQualityStats(null);
                        notificationService.error(`Water Quality API Error: ${error.message}`);
                    }
                }
            } finally {
                if (!signal.aborted) setIsFetching(false);
            }
        };

        fetchStats();
        return () => controller.abort();
    }, [shouldFetchPreview, filterSig, apiRetryCount]);

    // ── Effect 2: Availability — detail only ─────────────────────────────────
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (!shouldFetchDetail) {
            // preview or idle — cancel in-flight; data cleared by mode tracker above
            return () => controller.abort();
        }

        const fetchAvailability = async () => {
            try {
                const params = buildParams();
                const availability = await api.waterQuality.getAvailabilityStatistics(params, signal).catch(() => null);
                if (!signal.aborted) {
                    setWaterQualityAvailability(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(availability)) return prev;
                        return availability || null;
                    });
                }
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'CanceledError') return;
                if (!signal.aborted) console.error('Error fetching water quality availability:', error);
            }
        };

        fetchAvailability();
        return () => controller.abort();
    }, [shouldFetchDetail, filterSig]);

    // ── Derived data ─────────────────────────────────────────────────────────
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

    const blockWaterQualityData = useMemo(() => {
        const isActive = shouldFetchPreview;
        if (isActive && neighbor?.type === 'water_quality_well') {
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
    }, [displayRegion, displayBlock, shouldFetchPreview, waterQualityStats, neighbor]);

    return {
        waterQualityStats,
        waterQualityAvailability,
        waterQualityLoading,
        waterQualityError,
        qualityData,
        blockWaterQualityData
    };
};
