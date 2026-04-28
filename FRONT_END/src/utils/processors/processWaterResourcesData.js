import { RAJASTHAN_DAMS_DATA } from '../../data/damsData';
import { getPolygonCentroid } from '../mapUtils';
import { filterGeoJsonByBoundary } from '../spatialFilters';

export const processWaterResourcesData = (filters, processedBlockData, selectedDams, canalData, waterbodyData, microData, selectedBoundary) => {
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

            // For dams (represented as points at block centroids), spatial filtering at GP/Village 
            // level is often too restrictive as the centroid might not fall in the specific boundary.
            // We fallback to block-level matching if spatial filter returns nothing.
            const filteredDams = filterGeoJsonByBoundary({ type: 'FeatureCollection', features: damFeatures }, selectedBoundary, {
                field: 'District',
                value: filters.district,
                block: filters.block
            });

            if (filteredDams.features.length === 0 && damFeatures.length > 0 && (filters.gramPanchayat || filters.village)) {
                // If spatial filter removed everything but we have dams in the block, keep them
                combinedFeatures = [...combinedFeatures, ...damFeatures];
            } else {
                combinedFeatures = [...combinedFeatures, ...filteredDams.features];
            }
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
                'Name': f.properties.NAME || f.properties.Name || `Canal ${f.properties.fid || f.id || idx}`,
                'District': f.properties.DIST_NAME || f.properties.District || f.properties.DISTRICT || f.properties.DISTRICT_N_2 || '-',
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
                'Name': f.properties.NAME || f.properties.Name || f.properties.VILLAGE_NM || `Waterbody ${f.properties.fid || f.id || idx}`,
                'District': f.properties.DIST_NAME || f.properties.District || f.properties.DISTRICT || f.properties.DISTRICT_N_2 || '-',
                'Type': f.properties.TYPE || f.properties.Type || f.properties.Type_2 || 'Waterbody'
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
};
