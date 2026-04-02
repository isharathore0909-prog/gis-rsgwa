/**
 * Unified normalization and mapping for Rajasthan districts
 * Handles common variants between API sources and GeoJSON properties.
 */

const RAJASTHAN_DIST_MAP = {
    // Normalization table (Key must be result of .replace(/[^A-Z0-9]/g, ''))

    // Standard Variants
    'SRIGANGANAGAR': 'GANGANAGAR',
    'CHITTORGARH': 'CHITTAURGARH',
    'DHOLPUR': 'DHAULPUR',
    'JALORE': 'JALOR',
    'JHUNJHUNUN': 'JHUNJHUNU',
    'KERAULI': 'KARAULI',
    'KRAULI': 'KARAULI',
    'KAROLI': 'KARAULI',
    'DHAUSA': 'DAUSA',
    'BHARTPUR': 'BHARATPUR',
    'TONQUE': 'TONK',
    'BUNDI': 'BUNDI',
    'BUNEDI': 'BUNDI',
    'BUNDII': 'BUNDI',

    // Sawai Madhopur Variants
    'SAWAIMADHOPUR': 'SAWAIMADHOPUR',
    'SAWAIMADHOPURCITY': 'SAWAIMADHOPUR',
    'SAWAIMADHPUR': 'SAWAIMADHOPUR',
    'SWMADHOPUR': 'SAWAIMADHOPUR',
    'SMADHOPUR': 'SAWAIMADHOPUR',
    'SMADHOPURCITY': 'SAWAIMADHOPUR',
    'SAWAIMADOPUR': 'SAWAIMADHOPUR',
    'SAWAIMADHUPUR': 'SAWAIMADHOPUR',
    'SWM': 'SAWAIMADHOPUR',
    'SAWAIMADHURPUR': 'SAWAIMADHOPUR',
    'SAWAIMADHOPURDISTRICT': 'SAWAIMADHOPUR',
    'SAWAIMADHOPURDIST': 'SAWAIMADHOPUR',
    'MADHOPUR': 'SAWAIMADHOPUR',
    'MADHOPURSAWAI': 'SAWAIMADHOPUR',


    // Parent-Child Mappings for Split Districts (Approx 2023)
    'BALOTRA': 'BARMER',
    'DIDWANAKUCHAMAN': 'NAGAUR',
    'PHALODI': 'JODHPUR',
    'DEEG': 'BHARATPUR',
    'SALUMBAR': 'UDAIPUR',
    'BEAWAR': 'AJMER',
    'KEKRI': 'AJMER',
    'SHAHPURA': 'BHILWARA',
    'SHAHURA': 'BHILWARA',
    'DUDU': 'JAIPUR',
    'KOTPUTLIBEHROD': 'JAIPUR',
    'KHERTHALTIJARA': 'ALWAR',
    'SANCHORE': 'JALOR'
};

/**
 * Normalizes a district name to a standard key for matching.
 * Handles the 2023 Rajasthan district splits and common naming variants.
 */
export const normalizeDistrictName = (name) => {
    if (!name) return '';

    let normalized = name.toString().trim().toUpperCase();

    // 1. Strip common split tags BEFORE removing spaces to be precise
    // Handles tokens like " Rural", " District", " Dist.", " Station"
    normalized = normalized.replace(/\s+(RURAL|URBAN|DISTRICT|DIST|CITY|STATION|RAINSTATION)$/g, '');

    // 2. Final alphanumeric cleanup (removes spaces, dots, dashes)
    normalized = normalized.replace(/[^A-Z0-9]/g, '');

    // 3. Check against mapping table
    // If the map returns a name with spaces (like "SAWAI MADHOPUR"), 
    // it's used for the final lookup which will also be normalized.
    const mapped = RAJASTHAN_DIST_MAP[normalized];
    if (mapped) {
        return mapped.replace(/[^A-Z0-9]/g, '');
    }

    return normalized;
};
