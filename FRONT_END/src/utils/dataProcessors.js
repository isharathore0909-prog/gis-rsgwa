import { RAJASTHAN_DAMS_DATA } from '../data/damsData';
import { getPolygonCentroid } from './mapUtils';
import { filterGeoJsonByBoundary } from './spatialFilters';

export const getAttributeData = (filters, processedBlockData, neighbors, rainfallPoints, waterQualityRecords, aquiferRecords, selectedDams, canalData, waterbodyData, microData, rainfallStations, rainfallStationRecords, intersectingStationIds, rainfallStats, selectedBoundary, gwreFeatures) => {
    if (!filters || !filters.type) return null;

    if (filters.type === 'Ground Water Resource Estimation') {
        const hasGwreFeatures = gwreFeatures && gwreFeatures.features && gwreFeatures.features.length > 0;
        let features = hasGwreFeatures ? gwreFeatures.features : (processedBlockData?.features || []);

        // Always enforce district/block filters if we are using processedBlockData (the static map)
        // If gwreFeatures is used, the backend has already likely filtered it, but it's safe to enforce it anyway.
        if (filters.district) {
            features = features.filter(f => {
                const fDist = (f.properties.DIST_NAME || f.properties.District || f.properties.district_name || f.properties.district || f.properties.DISTRICT_N);
                return fDist && fDist.toUpperCase() === filters.district.toUpperCase();
            });
        }
        if (filters.block) {
            const targetBlock = filters.block.toUpperCase();
            features = features.filter(f => {
                const fBlock = (f.properties.BLOCK_NAME || f.properties.Block || f.properties.block_name || f.properties.block);
                return fBlock && fBlock.toUpperCase() === targetBlock;
            });
        }

        // Normalize properties
        features = features.map((f, idx) => ({
            ...f,
            id: f.id || `gwre-${idx}`,
            properties: {
                'Category': f.properties.Category || f.properties.GWDL || f.properties.CATEGORY || f.properties.block_status || 'Uncategorized',
                'District': f.properties.DIST_NAME || f.properties.District || f.properties.district_name || f.properties.DISTRICT_N || '-',
                'Block': f.properties.BLOCK_NAME || f.properties.Block || f.properties.block_name || f.properties.BLOCK || '-',
                'Net Availability': f.properties.NET_ANNUAL_GW_AVAILABILITY || f.properties.Net_Availability || f.properties.net_annual_gw_availability || 'N/A',
                'Draft': f.properties.EXISTING_GROSS_GW_DRAFT_ALL_USES || f.properties.Draft || f.properties.existing_gross_gw_draft_all_uses || 'N/A',
                'Stage': f.properties.STAGE_OF_GW_DEVELOPMENT || f.properties.Stage || f.properties.stage_of_gw_development || 'N/A'
            }
        }));

        return { type: 'FeatureCollection', features };
    }

    if (filters.type === 'Ground Water Level') {
        return {
            type: 'FeatureCollection',
            features: (neighbors.length > 0 ? neighbors : []).filter(well => {
                const matchDist = !filters.district || well.district?.toUpperCase() === filters.district.toUpperCase();
                const matchBlock = !filters.block || (well.block || well.taluka)?.toUpperCase() === filters.block.toUpperCase();
                return matchDist && matchBlock;
            }).map((well, idx) => {
                const props = {
                    'S.No.': idx + 1,
                    'Category': 'Ground Water Level',
                    'Well ID': well.well_id || well.id,
                    'District': well.district || '-',
                    'Block': well.block || well.taluka || '-',
                    'Village': well.village || '-',
                    'Depth': well.depth || 'N/A',
                    'Water Level': well.water_level || 'N/A'
                };

                // Attempt to add year-wise data if available in neighbors
                for (let year = 2015; year <= 2024; year++) {
                    props[`Pre ${year}`] = well[`pre_${year}`] || '-';
                    props[`Post ${year}`] = well[`pst_${year}`] || '-';
                }

                return {
                    type: 'Feature',
                    id: well.id || well.well_id || `well-${idx}`,
                    properties: props,
                    geometry: {
                        type: 'Point',
                        coordinates: [well.lng, well.lat]
                    }
                };
            })
        };
    }

    if (filters.type === 'Water Resources') {
        let combinedFeatures = [];

        if (filters.showDams) {
            if (selectedDams.length > 0) {
                combinedFeatures = [...combinedFeatures, ...selectedDams];
            } else {
                const damFeatures = RAJASTHAN_DAMS_DATA.map((dam, idx) => {
                    let geometry = null;
                    if (processedBlockData && processedBlockData.features) {
                        const blockFeature = processedBlockData.features.find(f => {
                            const dName = (f.properties.DIST_NAME || f.properties.District)?.toLowerCase();
                            const bName = (f.properties.BLOCK_NAME || f.properties.Block)?.toLowerCase();
                            return dName === dam.district?.toLowerCase() && bName === dam.block?.toLowerCase();
                        });
                        if (blockFeature) {
                            const centroid = getPolygonCentroid(blockFeature.geometry);
                            if (centroid) geometry = { type: 'Point', coordinates: [centroid.lng, centroid.lat] };
                        }
                    }

                    if (filters.district && dam.district?.toLowerCase() !== filters.district.toLowerCase()) return null;
                    if (filters.block && dam.block?.toLowerCase() !== filters.block.toLowerCase()) return null;

                    return {
                        type: 'Feature',
                        id: `dam-${idx}`,
                        properties: {
                            ...dam,
                            id: `dam-${idx}`,
                            'Category': 'Dam',
                            'Name': dam.name,
                            'District': dam.district,
                            'Block': dam.block,
                            'River': dam.river,
                            'Basin': dam.basin,
                            'Capacity': dam.capacity || 'N/A'
                        },
                        geometry: geometry
                    };
                }).filter(f => f !== null && f.geometry !== null);

                // Use spatial filter to handle GP/Village hierarchy even if names aren't in damsData
                const filteredDams = filterGeoJsonByBoundary({ type: 'FeatureCollection', features: damFeatures }, selectedBoundary, {
                    field: 'District',
                    value: filters.district,
                    block: filters.block
                });
                combinedFeatures = [...combinedFeatures, ...filteredDams.features];
            }
        }

        if (filters.showCanals && canalData?.features) {
            const filteredCanals = filterGeoJsonByBoundary(canalData, selectedBoundary, {
                field: 'District',
                value: filters.district,
                block: filters.block,
                gp: filters.gramPanchayat
            });

            const canalFeatures = filteredCanals.features.map((f, idx) => ({
                ...f,
                id: f.id || `canal-${idx}`,
                properties: {
                    ...f.properties,
                    'Category': 'Canal',
                    'Name': f.properties.NAME || f.properties.Name || 'Unnamed Canal',
                    'District': f.properties.DIST_NAME || f.properties.District || f.properties.DISTRICT || '-',
                    'Type': f.properties.TYPE || f.properties.Type || 'Canal'
                }
            }));
            combinedFeatures = [...combinedFeatures, ...canalFeatures];
        }

        if (filters.showWaterbodies && waterbodyData?.features) {
            const filteredWaterbodies = filterGeoJsonByBoundary(waterbodyData, selectedBoundary, {
                field: 'District',
                value: filters.district,
                block: filters.block,
                gp: filters.gramPanchayat
            });

            const waterbodyFeatures = filteredWaterbodies.features.map((f, idx) => ({
                ...f,
                id: f.id || `wb-${idx}`,
                properties: {
                    ...f.properties,
                    'Category': 'Waterbody',
                    'Name': f.properties.NAME || f.properties.Name || 'Unnamed Waterbody',
                    'District': f.properties.DIST_NAME || f.properties.District || f.properties.DISTRICT || '-',
                    'Type': f.properties.TYPE || f.properties.Type || 'Waterbody'
                }
            }));
            combinedFeatures = [...combinedFeatures, ...waterbodyFeatures];
        }

        if (filters.showMicro && microData?.features) {
            const filteredMicro = filterGeoJsonByBoundary(microData, selectedBoundary, {
                field: 'District',
                value: filters.district,
                block: filters.block,
                village: filters.village
            });

            const microFeatures = filteredMicro.features.map((f, idx) => ({
                ...f,
                id: f.id || `micro-${idx}`,
                properties: {
                    ...f.properties,
                    'Category': 'Micro Structure',
                    'Name': f.properties.Name || 'Unnamed Structure',
                    'District': f.properties.District || '-',
                    'Block': f.properties.Block || '-',
                    'Village': f.properties.Village || '-'
                }
            }));
            combinedFeatures = [...combinedFeatures, ...microFeatures];
        }

        return {
            type: 'FeatureCollection',
            features: combinedFeatures
        };
    }

    if (filters.type === 'Rainfall') {
        const baseFeatures = (neighbors && neighbors.length > 0) ? neighbors : (rainfallPoints || []);

        // ---------------------------------------------------------------------
        // PRIORITY: Show Station Data if available (as requested by user)
        // ---------------------------------------------------------------------
        if (rainfallStations && rainfallStations.length > 0) {

            // Group records by station for aggregation
            const recordsByStation = (rainfallStationRecords || []).reduce((acc, record) => {
                const sId = record.station || record.station_id;
                if (!acc[sId]) acc[sId] = [];
                acc[sId].push(record);
                return acc;
            }, {});

            const stationFeatures = rainfallStations.filter(station => {
                // If we have precise intersecting station IDs from the analysis hook, use them!
                if (intersectingStationIds && intersectingStationIds.length > 0) {
                    return intersectingStationIds.includes(station.id) || intersectingStationIds.includes(station.station_id);
                }

                // Fallback to district filter if no precise IDs available
                if (filters.district) {
                    return (station.district || '').toUpperCase() === filters.district.toUpperCase();
                }
                return true;
            }).map((station, idx) => {
                const sRecords = recordsByStation[station.id] || [];

                // Calculate stats
                const totalRainfall = sRecords.reduce((sum, r) => sum + (r.rainfall_mm || 0), 0);
                const avgRainfall = sRecords.length > 0 ? totalRainfall / sRecords.length : 0;

                // Sync count with backend stats if we only have one station selected (common case for Block/GP)
                let recordCount = sRecords.length;
                if (recordCount > 0 && rainfallStats?.count && (intersectingStationIds?.length === 1 || rainfallStats?.stationNames?.includes(station.name))) {
                    recordCount = rainfallStats.count;
                }

                // Get latest record
                const latestRecord = sRecords.length > 0
                    ? sRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                    : null;

                return {
                    type: 'Feature',
                    id: `station-${station.id}`,
                    properties: {
                        'Category': 'Rainfall Station',
                        'Station Name': station.name,
                        'District': station.district,
                        'Latest Date': latestRecord ? latestRecord.date : 'N/A',
                        'Latest Rainfall (mm)': latestRecord ? Number(latestRecord.rainfall_mm).toFixed(2) : '0.00',
                        'Total Rainfall (mm)': totalRainfall.toFixed(2),
                        'Avg Rainfall (mm)': avgRainfall.toFixed(2),
                        'Record Count': recordCount
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [station.longitude, station.latitude]
                    }
                };
            });

            return {
                type: 'FeatureCollection',
                features: stationFeatures
            };
        }

        // Fallback to existing village data logic
        return {
            type: 'FeatureCollection',
            features: baseFeatures.filter(item => {
                if (!item) return false;
                const props = item.properties || item;

                const dist = (props.district_name || props.district || props.DIST_NAME || props.District || '').toString().trim().toUpperCase();
                const blk = (props.block_name || props.block || props.BLOCK_NAME || props.Block || props.taluka || '').toString().trim().toUpperCase();
                const gp = (props.gram_panchayat_name || props.gram_panchayat || props.GP_NAME || props.GramPanchayat || '').toString().trim().toUpperCase();
                const vill = (props.village_name || props.village || props.VILL_NAME || props.Village || '').toString().trim().toUpperCase();

                const matchDist = !filters.district || dist === filters.district.trim().toUpperCase();
                const matchBlock = !filters.block || blk === filters.block.trim().toUpperCase();
                const matchGP = !filters.gramPanchayat || gp === filters.gramPanchayat.trim().toUpperCase();
                const matchVillage = !filters.village || vill === filters.village.trim().toUpperCase();

                if ((filters.village || filters.gramPanchayat) && rainfallPoints.length > 0) {
                    const villageMatch = !filters.village || vill === filters.village.trim().toUpperCase();
                    const gpMatch = !filters.gramPanchayat || gp === filters.gramPanchayat.trim().toUpperCase();
                    return villageMatch && gpMatch;
                }

                return matchDist && matchBlock && matchGP && matchVillage;
            })
                .map((item, idx) => {
                    const props = item.properties || item;
                    const rainValue = props.rainfall_mm !== undefined ?
                        Number(props.rainfall_mm).toFixed(2) :
                        (props['Rainfall (mm)'] !== undefined ? Number(props['Rainfall (mm)']).toFixed(2) : '0.00');

                    return {
                        type: 'Feature',
                        id: item.id || props.id || `rain-${idx}`,
                        properties: {
                            'Category': 'Rainfall',
                            'Date': props.date || props.rainfall_date || (props['Date'] || '-'),
                            'Rainfall (mm)': rainValue,
                            'District': props.district_name || props.district || props.DIST_NAME || props.District || '-',
                            'Block': props.block_name || props.block || props.BLOCK_NAME || props.Block || '-',
                            'Village': props.village_name || props.village || (props['Village'] || '-')
                        },
                        geometry: item.geometry || ((props.longitude && props.latitude) ? {
                            type: 'Point',
                            coordinates: [props.longitude, props.latitude]
                        } : null)
                    };
                })
        };
    }

    if (filters.type === 'Water Quality') {
        const records = waterQualityRecords || [];

        return {
            type: 'FeatureCollection',
            features: records.map((p, idx) => ({
                type: 'Feature',
                id: p.id || `wq-${idx}`,
                properties: {
                    'Category': 'Water Quality',
                    'Well ID': p.well_id,
                    'District': p.district || p.village__grampanchayat__block__district__name || '-',
                    'Block': p.block || p.village__grampanchayat__block__name || '-',
                    'Village': p.village_name || p.village__name || '-',
                    'pH': p.ph || '-',
                    'TDS': p.tds || '-',
                    'EC': p.ec || '-',
                    'Fluoride': p.fluoride || '-',
                    'Nitrate': p.nitrate || '-',
                    'Iron': p.iron || '-',
                    'Date': p.meta_date || '-'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [p.longitude, p.latitude]
                }
            }))
        };
    }

    if (filters.type === 'Well Inventory') {
        return {
            type: 'FeatureCollection',
            features: aquiferRecords.map((p, idx) => {
                const props = {
                    'S.No.': idx + 1,
                    'Category': 'Well Inventory (Detailed)',
                    'Well ID': p.well_id || '-',
                    'District': p.district || filters.district || '-',
                    'Block': p.block || filters.block || '-',
                    'Village': p.village_details?.name || p.village_name || '-',
                    'Aquifer': p.aquifer || '-',
                    'Depth (m)': p.well_depth || '-',
                    'Static WL': p.pre_2024 || p.pst_2024 || p.latest_pre?.value || p.latest_pst?.value || '-'
                };

                // Add year-wise water level data using standard backend keys (underscores)
                for (let year = 2015; year <= 2024; year++) {
                    props[`pre_${year}`] = p[`pre_${year}`] || '-';
                    props[`pst_${year}`] = p[`pst_${year}`] || '-';
                }

                return {
                    type: 'Feature',
                    id: p.id || p.well_id || `well-inv-${idx}`,
                    properties: props,
                    geometry: {
                        type: 'Point',
                        coordinates: [p.longitude, p.latitude]
                    }
                };
            })
        };
    }

    return null;
};
