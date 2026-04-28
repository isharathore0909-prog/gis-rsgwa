export const processWaterQualityData = (filters, waterQualityRecords) => {
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
                'Hardness': p.hardness || '-',
                'Alkalinity': p.alkalinity || '-',
                'Chloride': p.chloride || '-',
                'Iron': p.iron || '-',
                'Arsenic': p.arsenic || '-',
                'Uranium': p.uranium || '-',
                'Date': p.meta_date || '-'
            },
            geometry: {
                type: 'Point',
                coordinates: [p.longitude, p.latitude]
            }
        }))
    };
};

export const processWellInventoryData = (filters, aquiferRecords) => {
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
};
