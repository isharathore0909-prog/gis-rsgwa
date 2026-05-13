import { GW_CATEGORY_COLORS } from '../constants/mapConstants';

/**
 * Formats the information revealed when a user clicks a point on the map.
 * Extracts domain-specific metrics based on the active filter type.
 */
export const formatClickedFeatureInfo = (data, filterType) => {
    const rawItem = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!rawItem) return null;

    const cat = rawItem.gw_category;
    const catLower = cat ? cat.toLowerCase() : null;

    const payload = {
        district: rawItem.district || null,
        block: rawItem.block || null,
        loading: false
    };

    switch (filterType) {
        case 'Ground Water Resource Estimation':
            payload.category = cat || null;
            payload.categoryColor = catLower ? (GW_CATEGORY_COLORS[catLower] || '#94a3b8') : null;
            break;
        case 'Rainfall':
            payload.rainfall = rawItem.rainfall ? `${rawItem.rainfall} mm` : 'No Match';
            break;
        case 'Well Inventory':
            payload.water_level = rawItem.water_level ? `${rawItem.water_level} m bgl` : 'No Match';
            break;
        case 'Aquifer':
            payload.aquifer = rawItem.aquifer || 'No Match';
            break;
        case 'Water Resources':
            payload.water_resource = rawItem.water_resource;

            // Handle Dam marker clicks
            if (rawItem.type === 'dam') {
                payload.water_resource = `${rawItem.name} (${rawItem.river} River)`;
                payload.dam_details = {
                    Purpose: rawItem.purpose,
                    Type: rawItem.type,
                    District: rawItem.district,
                    Block: rawItem.block
                };
            }

            // Handle Recharge Structure marker clicks
            if (rawItem.structure_type) {
                payload.water_resource = `${rawItem.structure_type}${rawItem.status ? ` (${rawItem.status})` : ''}`;
            }

            if (!payload.water_resource) payload.water_resource = 'No Match';
            break;
        default:
            break;
    }

    return payload;
};
