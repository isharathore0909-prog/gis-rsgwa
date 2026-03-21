import { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';
import { getAquiferColor, normalizeAquiferName } from '../../constants/mapConstants';
import { resolveAquiferDistrict } from '../../constants/districtAliases';
import { DISTRICT_WATER_LEVEL_DATA } from '../../data/districtAquiferData';

export const useAquiferAnalysis = ({
    isAquifer,
    isGWRE,
    isWellInventory,
    isRainfall,
    isWaterQuality,
    isRechargeStructure,
    globalFilters,
    displayRegion,
    displayBlock,
    clickedLocation,
    neighbor,
    selectedBoundary,
    blockData
}) => {
    const [aquiferStats, setAquiferStats] = useState(null);
    const [aquiferLoading, setAquiferLoading] = useState(true);
    const [aquiferSpatialStats, setAquiferSpatialStats] = useState(null);
    const [spatialStatsLoading, setSpatialStatsLoading] = useState(false);
    const lastAquiferParams = useRef({ displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village });

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
        setAquiferSpatialStats(null);
        setSpatialStatsLoading(true);
        lastAquiferParams.current = { displayRegion, displayBlock, gp: globalFilters?.gramPanchayat, v: globalFilters?.village };
    }

    useEffect(() => {
        let ignore = false;
        const showSpatial = isAquifer || isWellInventory || isGWRE || isDefaultAquiferView;
        if (!showSpatial) {
            setAquiferSpatialStats(null);
            return;
        }

        const fetchSpatialStats = async () => {
            setSpatialStatsLoading(true);
            try {
                const res = await fetch('/data/aquifer_opt.json');
                if (!res.ok) throw new Error(`Failed to load aquifer_opt.json: ${res.status}`);
                const geojson = await res.json();
                const features = geojson.features || [];

                let filtered = features;
                const turf = await import('@turf/turf');

                let targetFeature = null;
                if (selectedBoundary && selectedBoundary.geometry) {
                    targetFeature = selectedBoundary;
                } else if (neighbor && neighbor.geometry) {
                    targetFeature = neighbor;
                } else if (displayBlock && blockData?.features) {
                    targetFeature = blockData.features.find(f => {
                        const props = f.properties || {};
                        if (props.is_parent || props.level === 'district') return false;
                        const bName = (props.BLOCK_NAME || props.Block || props.name || '').toString().trim().toUpperCase();
                        return bName === displayBlock.toString().trim().toUpperCase();
                    });
                }

                if (targetFeature) {
                    try {
                        const targetBbox = turf.bbox(targetFeature);
                        const [minLon, minLat, maxLon, maxLat] = targetBbox;

                        filtered = features.filter(f => {
                            if (!f.geometry) return false;
                            const fBbox = turf.bbox(f);
                            if (fBbox[0] > maxLon || fBbox[2] < minLon || fBbox[1] > maxLat || fBbox[3] < minLat) {
                                return false;
                            }
                            try { return turf.booleanIntersects(targetFeature, f); } catch (e) { return true; }
                        });
                    } catch (e) {
                        console.warn('[AquiferStats] Strict spatial filter failed, falling back to all features', e);
                    }
                } else if (displayRegion) {
                    const resolvedName = resolveAquiferDistrict(displayRegion);
                    const nameMatched = features.filter(f => {
                        const nd = (f.properties?.New_Dist || f.properties?.DIST_NAME || '').toUpperCase().trim();
                        return nd === resolvedName;
                    });

                    if (nameMatched.length > 0) {
                        filtered = nameMatched;
                    } else {
                        try {
                            const distRes = await fetch('/district.geojson');
                            const distGeo = await distRes.json();
                            const distFeature = (distGeo.features || []).find(f => {
                                const nm = (f.properties?.name || f.properties?.New_Dist || f.properties?.DIST_NAME || f.properties?.District || '').toUpperCase().trim();
                                return nm === displayRegion.toUpperCase().trim() || nm === resolvedName;
                            });

                            if (distFeature?.geometry) {
                                const coords = distFeature.geometry.type === 'Polygon' ? distFeature.geometry.coordinates.flat() : distFeature.geometry.coordinates.flat(2);
                                const lons = coords.map(c => c[0]);
                                const lats = coords.map(c => c[1]);
                                const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];
                                const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];

                                filtered = features.filter(f => {
                                    if (!f.geometry) return false;
                                    const fCoords = f.geometry.type === 'Polygon' ? f.geometry.coordinates.flat() : f.geometry.coordinates.flat(2);
                                    if (!fCoords.length) return false;
                                    const fLons = fCoords.map(c => c[0]);
                                    const fLats = fCoords.map(c => c[1]);
                                    const [fMinLon, fMaxLon] = [Math.min(...fLons), Math.max(...fLons)];
                                    const [fMinLat, fMaxLat] = [Math.min(...fLats), Math.max(...fLats)];
                                    return fMaxLon >= minLon && fMinLon <= maxLon && fMaxLat >= minLat && fMinLat <= maxLat;
                                });
                            }
                        } catch (bdErr) {
                            console.warn('[AquiferStats] district.geojson fallback failed:', bdErr);
                        }
                    }
                }

                const aggregated = {};
                for (const f of filtered) {
                    const rawType = (f.properties?.Aquifer || f.properties?.aquifer || f.properties?.AQUIFER || f.properties?.Aquifer_Type || 'Unknown').toString().trim();
                    const aqType = normalizeAquiferName(rawType);
                    if (!aggregated[aqType]) aggregated[aqType] = { count: 0, area: 0 };
                    aggregated[aqType].count += 1;
                    const storedArea = parseFloat(f.properties?.Area || f.properties?.AREA || f.properties?.Area_SqKm || f.properties?.Shape_Area || 0) || 0;
                    aggregated[aqType].area += storedArea;
                }

                const distribution = Object.entries(aggregated)
                    .map(([name, s]) => ({ name, count: s.count, area: Math.round(s.area * 100) / 100 }))
                    .sort((a, b) => b.count - a.count);

                if (!ignore) {
                    setAquiferSpatialStats({
                        layer_type: 'aquifer',
                        district: displayRegion || null,
                        total_count: distribution.reduce((s, d) => s + d.count, 0),
                        total_area: Math.round(distribution.reduce((s, d) => s + d.area, 0) * 100) / 100,
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
    }, [isAquifer, isWellInventory, isGWRE, isDefaultAquiferView, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, blockData, selectedBoundary, neighbor]);

    useEffect(() => {
        let ignore = false;
        const fetchAquiferData = async () => {
            setAquiferLoading(true);
            try {
                const params = { year: globalFilters?.year || 2024 };
                if (globalFilters?.district_id) params.district_id = globalFilters.district_id;
                else if (displayRegion) params.district = displayRegion;

                if (globalFilters?.block_id) params.block_id = globalFilters.block_id;
                else if (displayBlock) params.block = displayBlock;

                if (globalFilters?.gp_id) params.gp_id = globalFilters.gp_id;
                else if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;

                if (globalFilters?.village_id) params.village_id = globalFilters.village_id;
                else if (globalFilters?.village) params.village_name = globalFilters.village;

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
    }, [isAquifer, isWellInventory, displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, isGWRE, isRainfall, isWaterQuality, isRechargeStructure, isDefaultAquiferView, globalFilters?.year, globalFilters?.district_id, globalFilters?.block_id, globalFilters?.gp_id, globalFilters?.village_id]);

    const aquiferData = useMemo(() => {
        if (aquiferSpatialStats && aquiferSpatialStats.distribution) {
            const total_area = aquiferSpatialStats.total_area || 0;
            const total_count = aquiferSpatialStats.total_count || 1;
            const hasArea = total_area > 0;
            const total = hasArea ? total_area : total_count;

            const result = aquiferSpatialStats.distribution.map(item => {
                const val = hasArea ? item.area : item.count;
                const rawPct = total > 0 ? (val / total) * 100 : 0;
                return {
                    name: item.name,
                    value: val,
                    area: item.area,
                    count: item.count,
                    unit: hasArea ? 'km²' : 'features',
                    percent: Math.round(rawPct * 10) / 10,
                    color: getAquiferColor(item.name)
                };
            });

            const sumPct = result.reduce((s, d) => s + d.percent, 0);
            const diff = Math.round((100 - sumPct) * 10) / 10;
            if (diff !== 0 && result.length > 0) {
                result[0].percent = Math.round((result[0].percent + diff) * 10) / 10;
            }

            return !displayRegion ? result.slice(0, 5) : result;
        }

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

            return !displayRegion ? result.slice(0, 5) : result.slice(0, 10);
        }

        return [];
    }, [aquiferStats, aquiferSpatialStats, displayRegion]);

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

    return {
        aquiferStats,
        aquiferLoading,
        aquiferSpatialStats,
        spatialStatsLoading,
        aquiferData,
        waterLevelChartData
    };
};
