import { RAJASTHAN_DAMS_DATA } from '../data/damsData';
import { getPolygonCentroid } from './mapUtils';

export const getAttributeData = (filters, processedBlockData, neighbors, rainfallPoints, waterQualityRecords, aquiferRecords, selectedDams, canalData, waterbodyData, microData) => {
    if (!filters || !filters.type) return null;

    if (filters.type === 'Ground Water Resource Estimation') {
        let features = processedBlockData?.features || [];
        if (filters.district) {
            features = features.filter(f => (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === filters.district.toUpperCase());
        }
        if (filters.block) {
            const targetBlock = filters.block.toUpperCase();
            features = features.filter(f => (f.properties.BLOCK_NAME || f.properties.Block)?.toUpperCase() === targetBlock);
        }

        // Normalize properties
        features = features.map((f, idx) => ({
            ...f,
            id: f.id || `gwre-${idx}`,
            properties: {
                'Category': f.properties.Category || f.properties.GWDL || f.properties.CATEGORY || 'Uncategorized',
                'District': f.properties.DIST_NAME || f.properties.District || '-',
                'Block': f.properties.BLOCK_NAME || f.properties.Block || '-',
                'Net Availability': f.properties.NET_ANNUAL_GW_AVAILABILITY || f.properties.Net_Availability || 'N/A',
                'Draft': f.properties.EXISTING_GROSS_GW_DRAFT_ALL_USES || f.properties.Draft || 'N/A',
                'Stage': f.properties.STAGE_OF_GW_DEVELOPMENT || f.properties.Stage || 'N/A'
            }
        }));

        return { ...processedBlockData, features };
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
                combinedFeatures = [...combinedFeatures, ...damFeatures];
            }
        }

        if (filters.showCanals && canalData?.features) {
            const canalFeatures = canalData.features
                .filter(f => {
                    if (!filters.district) return true;
                    const dist = (f.properties.DIST_NAME || f.properties.District || f.properties.DISTRICT || '').toLowerCase();
                    return dist === filters.district.toLowerCase();
                })
                .map((f, idx) => ({
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
            const waterbodyFeatures = waterbodyData.features
                .filter(f => {
                    if (!filters.district) return true;
                    const dist = (f.properties.DIST_NAME || f.properties.District || f.properties.DISTRICT || '').toLowerCase();
                    return dist === filters.district.toLowerCase();
                })
                .map((f, idx) => ({
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
            const microFeatures = microData.features
                .filter(f => {
                    if (!filters.district) return true;
                    const dist = (f.properties.District || f.properties.DISTRICT || '').toLowerCase();
                    return dist === filters.district.toLowerCase();
                })
                .map((f, idx) => ({
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

                // If specialized filters (GP/Village) are active, and we have records, 
                // we should be careful not to filter out records that the backend specifically returned for us.
                // If the records don't have district/block names but are already in the array 
                // (because the backend filtered them for us), we might want to include them.
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
                    'Static WL': p.static_water_level || '-'
                };

                // Add year-wise water level data
                for (let year = 2015; year <= 2024; year++) {
                    props[`Pre ${year}`] = p[`pre_${year}`] || '-';
                    props[`Post ${year}`] = p[`pst_${year}`] || '-';
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
