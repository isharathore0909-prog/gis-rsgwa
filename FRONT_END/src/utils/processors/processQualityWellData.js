export const processWaterQualityData = (filters, waterQualityRecords) => {
    const records = waterQualityRecords || [];

    // Helper: return the numeric value as-is (including 0), or null if missing
    const num = (v) => (v !== null && v !== undefined && v !== '' ? v : null);
    // Helper: return a string label, falling back to '-'
    const str = (v) => v || '-';

    return {
        type: 'FeatureCollection',
        features: records.map((p, idx) => ({
            type: 'Feature',
            id: p.id || `wq-${idx}`,
            properties: {
                'Category': 'Water Quality',
                'Well ID': p.well_id,
                'District': str(p.district || p.village__grampanchayat__block__district__name),
                'Block': str(p.block || p.village__grampanchayat__block__name),
                'Village': str(p.village_name || p.village__name),
                'pH': num(p.ph),
                'TDS': num(p.tds),
                'EC': num(p.ec),
                'Fluoride': num(p.fluoride),
                'Nitrate': num(p.nitrate),
                'Hardness': num(p.hardness),
                'Calcium': num(p.calcium),
                'Magnesium': num(p.magnesium),
                'Sodium': num(p.sodium),
                'Potassium': num(p.potassium),
                'Carbonate': num(p.carbonate),
                'Bicarbonate': num(p.bicarbonate),
                'Alkalinity': num(p.alkalinity),
                'Sulphate': num(p.sulphate),
                'Chloride': num(p.chloride),
                'Iron': num(p.iron),
                'Arsenic': num(p.arsenic),
                'Uranium': num(p.uranium),
                'Date': str(p.meta_date)
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
