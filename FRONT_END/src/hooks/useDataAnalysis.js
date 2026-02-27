import { useState, useMemo, useEffect, useRef } from 'react';
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
import { getAquiferColor, normalizeAquiferName } from '../constants/mapConstants';
import { resolveAquiferDistrict } from '../constants/districtAliases';

// ---------------------------------------------------------------------------
// useDataAnalysis Hook
// 
// Centralizes data fetching and processing for the DataAnalysisSidebar.
// ---------------------------------------------------------------------------
export const useDataAnalysis = ({
    globalFilters,
    clickedLocation,
    neighbors,
    selectedBoundary,
    blockData,
    rainfallPoints = [],
    rainfallStations = [],
    rainfallStationRecords = [],
    parentRainfallLoading = false,
    parentWaterQualityLoading = false,
    parentAquiferLoading = false,
    parentRechargeLoading = false
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
    const filters = globalFilters; // Alias for convenience in some effects

    // -------------------------------------------------------------------------
    // State & Refs Declarations (Centralized to avoid ReferenceErrors)
    // -------------------------------------------------------------------------

    // GWRE
    const [gwreStats, setGwreStats] = useState(null);
    const [gwreLoading, setGwreLoading] = useState(false);

    // Water Quality
    const [waterQualityStats, setWaterQualityStats] = useState(null);
    const [waterQualityAvailability, setWaterQualityAvailability] = useState(null);
    const [waterQualityLoading, setWaterQualityLoading] = useState(true);
    const [waterQualityError, setWaterQualityError] = useState(null);
    const lastWQParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });

    // Aquifer
    const [aquiferStats, setAquiferStats] = useState(null);
    const [aquiferLoading, setAquiferLoading] = useState(true);
    const [aquiferSpatialStats, setAquiferSpatialStats] = useState(null);
    const [spatialStatsLoading, setSpatialStatsLoading] = useState(false);
    const lastAquiferParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });

    // Rainfall
    const [rainfallStatsData, setRainfallStatsData] = useState(null);
    const [rainfallSummaryData, setRainfallSummaryData] = useState([]);
    const [rainfallError, setRainfallError] = useState(null);
    const [rainfallLoading, setRainfallLoading] = useState(true);
    const lastRainfallDeps = useRef({ isRainfall, displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village, start: globalFilters?.dataRangeStart, end: globalFilters?.dataRangeEnd, ts: globalFilters?.timestep, lat: clickedLocation?.lat, lng: clickedLocation?.lng });
    const rainfallParamsCacheRef = useRef(null);

    // Recharge Structure
    const [rechargeStats, setRechargeStats] = useState(null);
    const [rechargeLoading, setRechargeLoading] = useState(true);
    const lastRechargeParams = useRef({ level: analysisLevel, name: analysisName });

    // CRITICAL: Reset all internal stats when the analysis type changes
    useEffect(() => {
        setGwreStats(null);
        setWaterQualityStats(null);
        setWaterQualityAvailability(null);
        setAquiferStats(null);
        setAquiferSpatialStats(null);
        setRainfallStatsData(null);
        setRainfallSummaryData([]);
        setRechargeStats(null);
    }, [globalFilters?.type]);



    // -------------------------------------------------------------------------
    // 3. GWRE Processing
    // -------------------------------------------------------------------------

    useEffect(() => {
        let ignore = false;
        if (!isGWRE && filters?.type !== 'Ground Water Resource Estimation') return;

        const fetchGWRE = async () => {
            setGwreLoading(true);
            try {
                const params = { layer_type: 'groundwater_zone' };
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                const data = await api.spatialLayer.getStatistics(params);
                if (!ignore) setGwreStats(data);
            } catch (err) {
                console.error('Failed to fetch GWRE stats:', err);
            } finally {
                if (!ignore) setGwreLoading(false);
            }
        };

        fetchGWRE();
        return () => { ignore = true; };
    }, [isGWRE, displayRegion, displayBlock, globalFilters?.gramPanchayat]);

    const pieData = useMemo(() => {
        if (gwreStats?.distribution && gwreStats.distribution.length > 0) {
            const colors = {
                'Over Exploited': '#e63946',
                'Saline': '#457b9d',
                'Critical': '#f4a261',
                'Semi Critical': '#e9c46a',
                'Safe': '#2a9d8f'
            };
            return gwreStats.distribution.map(d => ({
                name: d.name,
                value: d.count,
                area: d.area,
                color: colors[d.name] || '#e2e8f0'
            }));
        }

        // No real data available — return empty so the card hides cleanly
        return [];
    }, [gwreStats]);

    const totalBlocks = useMemo(() => {
        return gwreStats?.total_count || pieData.reduce((sum, item) => sum + (item.value || 0), 0);
    }, [gwreStats, pieData]);

    const waterLevelChartData = useMemo(() => {
        if (aquiferStats?.summary) {
            const s = aquiferStats.summary;
            return [
                { name: 'Pre-Monsoon', value: parseFloat((s.avg_pre_monsoon || 0).toFixed(2)), color: '#f4a261' },
                { name: 'Post-Monsoon', value: parseFloat((s.avg_pst_monsoon || 0).toFixed(2)), color: '#2a9d8f' },
                { name: 'Long Term Avg', value: parseFloat((s.avg_longterm || (s.avg_pre_monsoon * 1.1) || 0).toFixed(2)), color: '#457b9d' }
            ];
        }

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
    }, [displayRegion, aquiferStats]);

    // -------------------------------------------------------------------------
    // 3. Water Quality (DB + Static Fallback)
    // -------------------------------------------------------------------------
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
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;
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

    // -------------------------------------------------------------------------
    // 4. Aquifer Data
    // -------------------------------------------------------------------------
    // Sync loading state to filter changes — reset spatial stats when region changes
    // isDefaultAquiferView: true when no layer-specific type is active (fall-through overview)
    const isDefaultAquiferView = !isRainfall && !isWaterQuality && !isAquifer && !isWellInventory && !isGWRE && !isRechargeStructure;

    if ((isAquifer || isGWRE || isWellInventory || isDefaultAquiferView) && (
        lastAquiferParams.current.displayRegion !== displayRegion ||
        lastAquiferParams.current.displayBlock !== displayBlock ||
        lastAquiferParams.current.gp !== globalFilters?.gramPanchayat ||
        lastAquiferParams.current.v !== globalFilters?.village
    )) {
        if (!aquiferLoading) {
            setAquiferLoading(true);
            setAquiferStats(null);
        }
        // Reset spatial stats immediately so UI shows loading while new data fetches
        setAquiferSpatialStats(null);
        setSpatialStatsLoading(true);
        lastAquiferParams.current = { displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village };
    }

    useEffect(() => {
        let ignore = false;
        // Run spatial stats for explicit layer modes AND the default overview (no layer selected)
        const showSpatial = isAquifer || isWellInventory || isGWRE || isDefaultAquiferView;
        if (!showSpatial) {
            setAquiferSpatialStats(null);
            return;
        }

        /**
         * Compute aquifer statistics ENTIRELY CLIENT-SIDE from the static
         * /data/aquifer_opt.json (the same file the map renders), so the sidebar
         * always shows data — even if the backend SpatialLayer table is empty.
         *
         * District filtering strategy (in order of preference):
         *  1. Name-based match against New_Dist using resolvedDistrict alias
         *  2. Bounding-box spatial overlap with the district polygon from
         *     /district.geojson — covers newer districts not present in the GeoJSON.
         *  3. No filter (state overview) — shows top-N aquifer types across all features.
         */
        const fetchSpatialStats = async () => {
            setSpatialStatsLoading(true);
            try {
                // Load the static aquifer GeoJSON (cached by browser after first load)
                const res = await fetch('/data/aquifer_opt.json');
                if (!res.ok) throw new Error(`Failed to load aquifer_opt.json: ${res.status}`);
                const geojson = await res.json();
                const features = geojson.features || [];

                let filtered = features;

                if (displayRegion) {
                    // Pass 1: Name-based match using alias resolution
                    const resolvedName = resolveAquiferDistrict(displayRegion); // e.g. "BANSWARA" → "BANSWARA"
                    const nameMatched = features.filter(f => {
                        const nd = (f.properties?.New_Dist || f.properties?.DIST_NAME || '').toUpperCase().trim();
                        return nd === resolvedName;
                    });

                    if (nameMatched.length > 0) {
                        filtered = nameMatched;
                    } else {
                        // Pass 2: Bounding-box spatial overlap with district boundary
                        try {
                            const distRes = await fetch('/district.geojson');
                            const distGeo = await distRes.json();
                            const distFeature = (distGeo.features || []).find(f => {
                                const nm = (
                                    f.properties?.name || f.properties?.New_Dist ||
                                    f.properties?.DIST_NAME || f.properties?.District || ''
                                ).toUpperCase().trim();
                                return nm === displayRegion.toUpperCase().trim() ||
                                    nm === resolvedName;
                            });

                            if (distFeature?.geometry) {
                                // Compute district bounding box
                                const coords = distFeature.geometry.type === 'Polygon'
                                    ? distFeature.geometry.coordinates.flat()
                                    : distFeature.geometry.coordinates.flat(2);
                                const lons = coords.map(c => c[0]);
                                const lats = coords.map(c => c[1]);
                                const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];
                                const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];

                                filtered = features.filter(f => {
                                    if (!f.geometry) return false;
                                    const fCoords = f.geometry.type === 'Polygon'
                                        ? f.geometry.coordinates.flat()
                                        : f.geometry.coordinates.flat(2);
                                    if (!fCoords.length) return false;
                                    const fLons = fCoords.map(c => c[0]);
                                    const fLats = fCoords.map(c => c[1]);
                                    const [fMinLon, fMaxLon] = [Math.min(...fLons), Math.max(...fLons)];
                                    const [fMinLat, fMaxLat] = [Math.min(...fLats), Math.max(...fLats)];
                                    // Bounding-box overlap test
                                    return fMaxLon >= minLon && fMinLon <= maxLon &&
                                        fMaxLat >= minLat && fMinLat <= maxLat;
                                });
                            }
                        } catch (bdErr) {
                            console.warn('[AquiferStats] district.geojson fallback failed:', bdErr);
                        }
                    }
                }

                // Pass 3: When a block is selected, further narrow to features whose
                // bounding box overlaps the block boundary polygon.
                // blockDataRef.current is the block GeoJSON already loaded by the map.
                if (displayBlock && filtered.length > 0) {
                    const blockGeo = blockData;
                    const blockFeature = blockGeo?.features?.find(f => {
                        const props = f.properties || {};
                        // Skip district-level parent entries
                        if (props.is_parent || props.level === 'district') return false;
                        const bName = (props.BLOCK_NAME || props.Block || props.name || '')
                            .toString().trim().toUpperCase();
                        return bName === displayBlock.toString().trim().toUpperCase();
                    });

                    if (blockFeature?.geometry) {
                        // Compute block bounding box
                        const bCoords = blockFeature.geometry.type === 'Polygon'
                            ? blockFeature.geometry.coordinates.flat()
                            : blockFeature.geometry.coordinates.flat(2);
                        const bLons = bCoords.map(c => c[0]);
                        const bLats = bCoords.map(c => c[1]);
                        const [bMinLon, bMaxLon] = [Math.min(...bLons), Math.max(...bLons)];
                        const [bMinLat, bMaxLat] = [Math.min(...bLats), Math.max(...bLats)];

                        filtered = filtered.filter(f => {
                            if (!f.geometry) return false;
                            const fCoords = f.geometry.type === 'Polygon'
                                ? f.geometry.coordinates.flat()
                                : f.geometry.coordinates.flat(2);
                            if (!fCoords.length) return false;
                            const fLons = fCoords.map(c => c[0]);
                            const fLats = fCoords.map(c => c[1]);
                            const [fMinLon, fMaxLon] = [Math.min(...fLons), Math.max(...fLons)];
                            const [fMinLat, fMaxLat] = [Math.min(...fLats), Math.max(...fLats)];
                            // Bounding-box overlap test
                            return fMaxLon >= bMinLon && fMinLon <= bMaxLon &&
                                fMaxLat >= bMinLat && fMinLat <= bMaxLat;
                        });
                    }
                }

                // Aggregate by Aquifer type (normalize abbreviated/variant names first)
                const aggregated = {};
                for (const f of filtered) {
                    const rawType = (
                        f.properties?.Aquifer || f.properties?.aquifer ||
                        f.properties?.AQUIFER || f.properties?.Aquifer_Type ||
                        'Unknown'
                    ).toString().trim();
                    // Expand abbreviations (BGC → Banded Gneissic Complex, etc.) and
                    // merge synonyms (Hilly Area → Hills, Ryolite → Rhyolite)
                    const aqType = normalizeAquiferName(rawType);
                    if (!aggregated[aqType]) aggregated[aqType] = { count: 0, area: 0 };
                    aggregated[aqType].count += 1;
                    // Use stored area property if available (Shape_Area in degrees² → rough km²)
                    const storedArea = parseFloat(
                        f.properties?.Area || f.properties?.AREA ||
                        f.properties?.Area_SqKm || f.properties?.Shape_Area || 0
                    ) || 0;
                    aggregated[aqType].area += storedArea;
                }

                const distribution = Object.entries(aggregated)
                    .map(([name, s]) => ({ name, count: s.count, area: Math.round(s.area * 100) / 100 }))
                    .sort((a, b) => b.count - a.count);

                const total_count = distribution.reduce((s, d) => s + d.count, 0);
                const total_area = distribution.reduce((s, d) => s + d.area, 0);

                if (!ignore) {
                    setAquiferSpatialStats({
                        layer_type: 'aquifer',
                        district: displayRegion || null,
                        spatial_filter_applied: !!displayRegion,
                        total_count,
                        total_area: Math.round(total_area * 100) / 100,
                        distribution
                    });
                    setSpatialStatsLoading(false);
                }
            } catch (err) {
                console.error('[AquiferStats] Client-side computation failed:', err);
                if (!ignore) setSpatialStatsLoading(false);
            }
        };

        fetchSpatialStats();
        return () => { ignore = true; };
    }, [isAquifer, isWellInventory, isGWRE, isDefaultAquiferView, displayRegion, displayBlock, globalFilters?.gramPanchayat, blockData]);

    useEffect(() => {
        let ignore = false;
        // Fetch for explicit layer types OR when no layer-specific view is active (default overview)
        const showAquiferData = isAquifer || isGWRE || isWellInventory || (!isRainfall && !isWaterQuality && !isWellInventory && !isRechargeStructure);
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
                if (!ignore) setAquiferStats(data);
            } catch (error) {
                if (!ignore) {
                    console.error('Error fetching aquifer data:', error);
                    setAquiferStats(null);
                }
            } finally {
                if (!ignore) setAquiferLoading(false);
            }
        };

        fetchAquiferData();
        return () => { ignore = true; };
    }, [isAquifer, isWellInventory, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, isGWRE, isRainfall, isWaterQuality, isRechargeStructure]);

    const aquiferData = useMemo(() => {
        // Priority: Use spatial data (computed from GeoJSON geometry) if available
        if (aquiferSpatialStats && aquiferSpatialStats.distribution) {
            const total_area = aquiferSpatialStats.total_area || 0;
            const total_count = aquiferSpatialStats.total_count || 1;
            const hasArea = total_area > 0;
            const total = hasArea ? total_area : total_count;

            // Compute raw percentages with 1 decimal place precision
            const result = aquiferSpatialStats.distribution.map(item => {
                const val = hasArea ? item.area : item.count;
                const rawPct = total > 0 ? (val / total) * 100 : 0;
                return {
                    name: item.name,
                    value: val,
                    area: item.area,
                    count: item.count,
                    unit: hasArea ? 'km²' : 'features',
                    percent: Math.round(rawPct * 10) / 10,  // 1 decimal place
                    color: getAquiferColor(item.name)
                };
            });

            // Largest-remainder correction so all percents sum to exactly 100
            const sumPct = result.reduce((s, d) => s + d.percent, 0);
            const diff = Math.round((100 - sumPct) * 10) / 10;
            if (diff !== 0 && result.length > 0) {
                result[0].percent = Math.round((result[0].percent + diff) * 10) / 10;
            }

            // Limit to top 5 if no specific location is selected (State Level)
            if (!displayRegion) {
                return result.slice(0, 5);
            }
            return result;
        }

        // Fallback: Use aquifer stats from wells
        if (aquiferStats && aquiferStats.aquifer_distribution && aquiferStats.aquifer_distribution.length > 0) {
            const totalWells = aquiferStats.summary.total_wells || 1;
            const result = aquiferStats.aquifer_distribution
                .map((aq) => ({
                    name: aq.aquifer || 'Unknown',
                    value: aq.count,
                    unit: 'Wells',
                    percent: Math.round((aq.count / totalWells) * 100),
                    color: getAquiferColor(aq.aquifer)
                }))
                .sort((a, b) => b.value - a.value);

            // Limit to top 5 if no specific location is selected (State Level)
            if (!displayRegion) {
                return result.slice(0, 5);
            }
            return result.slice(0, 10); // Default limit for fallback
        }

        return [];
    }, [aquiferStats, aquiferSpatialStats, displayRegion]);

    // -------------------------------------------------------------------------
    // 5. Rainfall Data
    // -------------------------------------------------------------------------
    // Sync loading state to filter changes
    if (isRainfall && (
        lastRainfallDeps.current.isRainfall !== isRainfall ||
        lastRainfallDeps.current.displayRegion !== displayRegion ||
        lastRainfallDeps.current.displayBlock !== displayBlock ||
        lastRainfallDeps.current.gp !== globalFilters?.gramPanchayat ||
        lastRainfallDeps.current.v !== globalFilters?.village ||
        lastRainfallDeps.current.start !== globalFilters?.dataRangeStart ||
        lastRainfallDeps.current.end !== globalFilters?.dataRangeEnd ||
        lastRainfallDeps.current.ts !== globalFilters?.timestep ||
        lastRainfallDeps.current.lat !== clickedLocation?.lat ||
        lastRainfallDeps.current.lng !== clickedLocation?.lng
    )) {
        if (!rainfallLoading) {
            setRainfallLoading(true);
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
        }
        lastRainfallDeps.current = { isRainfall, displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village, start: globalFilters?.dataRangeStart, end: globalFilters?.dataRangeEnd, ts: globalFilters?.timestep, lat: clickedLocation?.lat, lng: clickedLocation?.lng };
    }

    useEffect(() => {
        let ignore = false;
        if (!isRainfall) {
            setRainfallStatsData(null);
            setRainfallSummaryData([]);
            setRainfallError(null);
            rainfallParamsCacheRef.current = null;
            return;
        }

        const fetchRainfallStats = async () => {
            const baseParams = {};
            const toTitleCase = (str) => {
                if (!str) return str;
                const strValue = typeof str === 'string' ? str : String(str);
                return strValue.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            };

            if (displayRegion && displayRegion !== 'Rajasthan') {
                const regionStr = typeof displayRegion === 'string' ? displayRegion : String(displayRegion);
                baseParams.district = toTitleCase(regionStr.trim());
            }

            if (displayBlock) {
                const blockStr = typeof displayBlock === 'string' ? displayBlock : String(displayBlock);
                baseParams.block = toTitleCase(blockStr.trim());
            }
            if (globalFilters?.gramPanchayat) {
                const gpStr = typeof globalFilters.gramPanchayat === 'string' ? globalFilters.gramPanchayat : String(globalFilters.gramPanchayat);
                baseParams.gram_panchayat = gpStr.trim();
            }
            if (globalFilters?.village) {
                const villageStr = typeof globalFilters.village === 'string' ? globalFilters.village : String(globalFilters.village);
                baseParams.village = villageStr.trim();
            }
            if (globalFilters?.dataRangeStart) baseParams.start_date = globalFilters.dataRangeStart;
            if (globalFilters?.dataRangeEnd) baseParams.end_date = globalFilters.dataRangeEnd;

            if (baseParams.district === 'Rajasthan') delete baseParams.district;

            setRainfallLoading(true);
            try {
                let currentBaseParams = { ...baseParams };
                let currentSummaryParams = { ...baseParams, timestep: globalFilters?.timestep || 'monthly' };

                // Apply spatial filtering if block, GP, or village is selected
                if ((displayBlock || globalFilters?.gramPanchayat || globalFilters?.village) && rainfallStations?.length > 0) {
                    try {
                        const turf = await import('@turf/turf');
                        let targetFeature = null;

                        // Priority 1: neighbor geometry (from map click)
                        if (neighbor && neighbor.geometry) {
                            targetFeature = neighbor;
                        }
                        // Priority 2: selectedBoundary from hierarchy context (GP, Village, Block dropdown)
                        else if (selectedBoundary && selectedBoundary.geometry) {
                            targetFeature = selectedBoundary;
                        }
                        // Priority 3: block lookup from blockData (for dropdown selection fallback)
                        else if (displayBlock && blockData?.features) {
                            targetFeature = blockData.features.find(f => {
                                const bName = (f.properties?.BLOCK_NAME || f.properties?.Block || f.properties?.name || '').toString().toUpperCase().trim();
                                return bName === displayBlock.toString().toUpperCase().trim();
                            });
                        }

                        if (targetFeature && targetFeature.geometry) {
                            const intersectingStationIds = [];
                            rainfallStations.forEach(station => {
                                if (station.latitude && station.longitude) {
                                    const pt = turf.point([parseFloat(station.longitude), parseFloat(station.latitude)]);
                                    if (turf.booleanPointInPolygon(pt, targetFeature)) {
                                        intersectingStationIds.push(station.id || station.station_id);
                                    }
                                }
                            });
                            const idsStr = intersectingStationIds.length > 0 ? intersectingStationIds.join(',') : '-1';
                            currentBaseParams.station_ids = idsStr;
                            currentSummaryParams.station_ids = idsStr;
                        }
                    } catch (e) {
                        console.warn("Spatial filtering for stations failed:", e);
                    }
                }

                // Attempt to fetch station-based stats if stations are expected/available
                let stats = null;
                let summary = [];
                let isStationData = false;

                if (rainfallStations && rainfallStations.length > 0) {
                    const [sStats, sSummary] = await Promise.all([
                        api.rainfall.getStationStatistics(currentBaseParams).catch(() => null),
                        api.rainfall.getStationSummary(currentSummaryParams).catch(() => [])
                    ]);

                    if (sStats && sStats.count > 0) {
                        stats = sStats;
                        summary = sSummary;
                        isStationData = true;
                    }
                }

                // Fallback to General Village/District statistics if station data is empty or unavailable
                // This is crucial for the State Overview where station-aggregated stats might be empty
                if (!stats || stats.count === 0) {
                    const [gStats, gSummary] = await Promise.all([
                        api.rainfall.getStatistics(baseParams).catch(() => null),
                        api.rainfall.getSummary(summaryParams).catch(() => [])
                    ]);

                    if (gStats && (gStats.count > 0 || gStats.total_count > 0)) {
                        stats = gStats;
                        summary = gSummary;
                        isStationData = false;
                    }
                }

                if (!ignore) {
                    if (stats && (stats.count > 0 || stats.total_count > 0)) {
                        setRainfallStatsData({
                            ...stats,
                            count: stats.count || stats.total_count,
                            maxVillage: stats.max_village || stats.highest_rainfall_area,
                            maxDate: stats.max_date || stats.highest_rainfall_date,
                            isEmpty: false,
                            isStationData
                        });
                        setRainfallSummaryData(summary || []);
                    } else {
                        // Final check: if we have clicked location but no stats found
                        const hasClickedLocation = clickedLocation && clickedLocation.lat && clickedLocation.lng;
                        if (hasClickedLocation && globalFilters?.gramPanchayat) {
                            const nearbyParams = {
                                lat: clickedLocation.lat,
                                lon: clickedLocation.lng,
                                gram_panchayat: globalFilters.gramPanchayat,
                                radius_km: 10,
                                timestep: globalFilters?.timestep || 'monthly'
                            };
                            const nearbyData = await api.rainfall.getNearby(nearbyParams);
                            if (nearbyData.stats) {
                                setRainfallStatsData({
                                    ...nearbyData.stats,
                                    maxVillage: nearbyData.stats.max_village,
                                    maxDate: nearbyData.stats.max_date,
                                    isNearbyData: true
                                });
                                setRainfallSummaryData(nearbyData.summary || []);
                                return;
                            }
                        }

                        if (!parentRainfallLoading) {
                            setRainfallStatsData({ isEmpty: true });
                        }
                        setRainfallSummaryData([]);
                    }
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching rainfall stats:", err);
                    setRainfallError(err.message);
                }
            } finally {
                if (!ignore) setRainfallLoading(false);
            }
        };

        fetchRainfallStats();
        return () => { ignore = true; };
    }, [
        isRainfall,
        displayRegion,
        displayBlock,
        globalFilters?.gramPanchayat,
        globalFilters?.village,
        globalFilters?.dataRangeStart,
        globalFilters?.dataRangeEnd,
        globalFilters?.timestep,
        clickedLocation?.lat,
        clickedLocation?.lng,
        rainfallStationRecords,
        rainfallStations,
        selectedBoundary
    ]);

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
    // Sync loading state to filter changes
    if (isRechargeStructure && (lastRechargeParams.current.level !== analysisLevel || lastRechargeParams.current.name !== analysisName)) {
        if (!rechargeLoading) {
            setRechargeLoading(true);
            setRechargeStats(null);
        }
        lastRechargeParams.current = { level: analysisLevel, name: analysisName };
    }

    useEffect(() => {
        let ignore = false;
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
                if (!ignore) setRechargeStats(data);
            } catch (error) {
                if (!ignore) {
                    console.error('Error fetching recharge stats:', error);
                    setRechargeStats(null);
                }
            } finally {
                if (!ignore) setRechargeLoading(false);
            }
        };

        fetchRechargeStats();
        return () => { ignore = true; };
    }, [isRechargeStructure, analysisLevel, analysisName]);



    return {
        // Flags
        isGWRE, isRainfall, isWaterQuality, isAquifer, isWellInventory, isRechargeStructure,
        // Context
        displayRegion, displayBlock, analysisLevel, analysisName, neighbor,
        // GWRE
        pieData, totalBlocks, waterLevelChartData,
        // Water Quality
        qualityData, blockWaterQualityData, waterQualityLoading: waterQualityLoading || parentWaterQualityLoading, waterQualityStats, waterQualityAvailability, waterQualityError,
        // Aquifer — loading = true only while the GeoJSON spatial fetch is in-flight
        aquiferData,
        aquiferLoading: spatialStatsLoading || (!aquiferSpatialStats && (aquiferLoading || parentAquiferLoading)),
        aquiferSpatialFilterApplied: aquiferSpatialStats?.spatial_filter_applied || false,
        aquiferTotalArea: aquiferSpatialStats?.total_area || 0,
        aquiferTotalCount: aquiferSpatialStats?.total_count || 0,
        // Rainfall
        rainfallStats: rainfallStatsMemo, rainfallSummaryData, rainfallLoading: rainfallLoading || parentRainfallLoading, rainfallError,
        // Recharge
        rechargeStats, rechargeLoading: rechargeLoading || parentRechargeLoading
    };
};
