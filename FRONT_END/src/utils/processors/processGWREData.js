export const processGWREData = (filters, processedBlockData, gwreFeatures) => {
    const hasGwreFeatures = gwreFeatures && gwreFeatures.features && gwreFeatures.features.length > 0;
    let features = hasGwreFeatures ? gwreFeatures.features : (processedBlockData?.features || []);

    // Only enforce strict property-based filtering if we are NOT using backend-fetched data.
    // If we have backend data (gwreFeatures), it has already been filtered by the backend 
    // (either by property or spatial fallback for new districts). Enforcing it again 
    // in the frontend would hide data for new districts (like Beawar) where features 
    // are still tagged with their old district names in the source data.
    if (!hasGwreFeatures) {
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
};
