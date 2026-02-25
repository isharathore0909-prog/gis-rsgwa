/**
 * districtAliases.js
 *
 * Rajasthan underwent a major district reorganisation in August 2023, increasing
 * the district count from 33 to 50.  The aquifer GeoJSON (aquifer_opt.json) was
 * prepared before this reorganisation, so the New_Dist values inside it still use
 * the OLD (pre-2023) district names.
 *
 * This map lets us translate a new district name → the old district name that is
 * actually stored in the GeoJSON, so that the map and the Data Analysis sidebar
 * can both display the correct aquifer information.
 *
 * Keys   : new district names in UPPER CASE
 * Values : corresponding old district name in UPPER CASE (as it appears in New_Dist)
 *
 * Districts NOT listed here are assumed to exist in the GeoJSON under the same name.
 */
export const DISTRICT_ALIASES = {
    // New district       : Old parent district (as stored in aquifer GeoJSON)
    'BALOTRA': 'BARMER',
    'BEAWAR': 'AJMER',
    'DEEG': 'BHARATPUR',
    'DIDWANA-KUCHAMAN': 'NAGAUR',
    'DIDWANA KUCHAMAN': 'NAGAUR',
    'DUDU': 'JAIPUR',
    'GANGAPUR CITY': 'SAWAI MADHOPUR',
    'GANGAPUR': 'SAWAI MADHOPUR',
    'JODHPUR RURAL': 'JODHPUR',
    'KEKRI': 'AJMER',
    'KHAIRTHAL-TIJARA': 'ALWAR',
    'KHAIRTHAL TIJARA': 'ALWAR',
    'KOTPUTLI-BEHROR': 'ALWAR',
    'KOTPUTLI BEHROR': 'ALWAR',
    'KOTPUTLI': 'ALWAR',
    'PHALODI': 'JODHPUR',
    'SALUMBAR': 'UDAIPUR',
    'SANCHORE': 'JALOR',
    'SHAHPURA': 'BHILWARA',
    'NEEM KA THANA': 'SIKAR',
    'NEEM-KA-THANA': 'SIKAR',
    'ANUPGARH': 'SRIGANGANAGAR',
    'SRI GANGANAGAR': 'SRIGANGANAGAR',
    'KARAULI': 'SAWAI MADHOPUR',
};

/**
 * Resolve a district name to the one actually stored in the aquifer GeoJSON.
 *
 * @param {string} district  - District name as selected in the UI (any case)
 * @returns {string}          - UPPER-CASE district name suitable for matching New_Dist
 */
export function resolveAquiferDistrict(district) {
    if (!district) return null;
    const upper = district.toString().toUpperCase().trim();
    return DISTRICT_ALIASES[upper] || upper;
}
