export const processGWLevelData = (filters, neighbors) => {
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
};
