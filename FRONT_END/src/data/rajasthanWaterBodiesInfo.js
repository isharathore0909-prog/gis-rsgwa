// Comprehensive Water Bodies Information for Rajasthan
// Source: Rivers, Lakes and Dams of Rajasthan (rajras.in)
// Updated: January 2026

/**
 * MAJOR LAKES IN RAJASTHAN
 */
export const RAJASTHAN_LAKES = {
    saline: [
        {
            name: 'Sambhar Lake',
            district: 'Jaipur/Nagaur/Ajmer',
            type: 'Saline',
            significance: 'Largest saline lake in India',
            production: 'Produces 8.7% of India\'s salt',
            area_sqkm: 'Variable (seasonal)',
            notes: 'Ramsar wetland site'
        },
        {
            name: 'Didwana Lake',
            district: 'Nagaur',
            type: 'Saline',
            significance: 'Salt production',
            notes: 'Important for salt industry'
        },
        {
            name: 'Panchpadra Lake',
            district: 'Barmer',
            type: 'Saline',
            significance: 'Salt production',
            notes: 'Located in western Rajasthan'
        },
        {
            name: 'Lunkaransar Lake',
            district: 'Bikaner',
            type: 'Saline',
            significance: 'Salt production',
            notes: 'Seasonal lake'
        }
    ],
    freshwater: [
        {
            name: 'Jaisamand (Dhebar Lake)',
            district: 'Udaipur',
            type: 'Artificial',
            significance: 'Largest artificial lake in Rajasthan',
            built_by: 'Maharana Jai Singh (1685-1691)',
            river: 'Gomti',
            notes: 'Second largest artificial lake in Asia'
        },
        {
            name: 'Rajsamand Lake',
            district: 'Rajsamand',
            type: 'Artificial',
            significance: 'Historic lake with inscriptions',
            built_by: 'Maharana Raj Singh (1662)',
            river: 'Gomti',
            notes: 'Famous for "Nau Chauki" inscriptions - longest stone inscription in India'
        },
        {
            name: 'Pichola Lake',
            district: 'Udaipur',
            type: 'Artificial',
            significance: 'Iconic tourist attraction',
            built_by: 'Pichhu Banjara (1362), expanded by Maharana Udai Singh',
            notes: 'Lake Palace and Jag Mandir located here'
        },
        {
            name: 'Fateh Sagar Lake',
            district: 'Udaipur',
            type: 'Artificial',
            significance: 'Major tourist attraction',
            built_by: 'Maharana Jai Singh (1678), rebuilt by Maharana Fateh Singh',
            notes: 'Three islands including Nehru Park'
        },
        {
            name: 'Nakki Lake',
            district: 'Sirohi (Mount Abu)',
            type: 'Natural',
            significance: 'Holy lake, tourist attraction',
            notes: 'Legend says it was dug by nails (nakhs); only hill station lake in Rajasthan'
        },
        {
            name: 'Pushkar Lake',
            district: 'Ajmer',
            type: 'Natural/Sacred',
            significance: 'Holy pilgrimage site',
            notes: 'One of the five sacred lakes (Panch-Sarovar); 52 ghats'
        },
        {
            name: 'Ana Sagar Lake',
            district: 'Ajmer',
            type: 'Artificial',
            significance: 'Historic lake',
            built_by: 'Anaji Chauhan (1135-1150 AD)',
            notes: 'Source of Luni River'
        }
    ]
};

/**
 * MAJOR TRIBUTARIES OF RAJASTHAN RIVERS
 */
export const RIVER_TRIBUTARIES = {
    Chambal: {
        right_bank: ['Kalisindh', 'Parbati', 'Banas'],
        left_bank: ['Retam', 'Ansar', 'Kunu'],
        notes: 'Banas is the largest tributary'
    },
    Banas: {
        right_bank: ['Berach', 'Menali', 'Kothari', 'Khari'],
        left_bank: ['Dai', 'Dheel', 'Sohadra', 'Morel'],
        notes: 'Berach is the largest tributary of Banas'
    },
    Luni: {
        right_bank: ['Sukri', 'Mithri', 'Bandi', 'Khari'],
        left_bank: ['Jawai', 'Guhiya', 'Sagi'],
        notes: 'Jawai is the largest tributary; has Jawai Dam'
    },
    Mahi: {
        tributaries: ['Som', 'Jakham', 'Anas', 'Chap', 'Moran'],
        notes: 'Jakham has the highest dam in Rajasthan (81m)'
    }
};

/**
 * IMPORTANT DAMS - SPECIAL FEATURES
 */
export const SPECIAL_DAMS_INFO = {
    'Bisalpur Dam': {
        river: 'Banas',
        district: 'Tonk',
        significance: 'Major drinking water source for Jaipur and Ajmer',
        type: 'Earthen/Gravity & Masonry',
        height_m: 39.5,
        completion: 1999,
        projects: 'Brahmani-Banas link project'
    },
    'Mahi Bajaj Sagar Dam': {
        river: 'Mahi',
        district: 'Banswara',
        significance: 'Hydroelectric power generation',
        type: 'Earthen/Gravity & Masonry',
        height_m: 74.5,
        completion: 1985,
        power: 'Major power project'
    },
    'Jakham Dam': {
        river: 'Jakham (Mahi tributary)',
        district: 'Pratapgarh',
        significance: 'Highest dam in Rajasthan',
        type: 'Gravity & Masonry',
        height_m: 87,
        completion: 1986,
        notes: 'Tallest dam structure in the state'
    },
    'Jawai Dam': {
        river: 'Jawai (Luni tributary)',
        district: 'Pali',
        significance: 'Known as "Amrit Sarovar" of Marwar',
        type: 'Gravity & Masonry',
        height_m: 20.72,
        completion: 1957,
        notes: 'Important for western Rajasthan irrigation'
    },
    'Panchana Dam': {
        river: 'Gambhiri',
        district: 'Karauli',
        significance: 'Built with clay/soil',
        type: 'Earthen/Gravity & Masonry',
        height_m: 33.19,
        completion: 1977,
        notes: 'Unique construction using soil'
    },
    'Rana Pratap Sagar Dam': {
        river: 'Chambal',
        district: 'Chittorgarh',
        significance: 'Part of Chambal Valley Project',
        type: 'Gravity & Masonry',
        height_m: 53.9,
        completion: 1970,
        power: 'Hydroelectric power generation'
    },
    'Jawahar Sagar Dam': {
        river: 'Chambal',
        district: 'Bundi',
        significance: 'Part of Chambal Valley Project',
        type: 'Gravity & Masonry',
        height_m: 36,
        completion: 1973,
        power: 'Hydroelectric power generation'
    },
    'Gandhi Sagar Dam': {
        river: 'Chambal',
        district: 'MP/Rajasthan border',
        significance: 'Part of Chambal Valley Project',
        notes: 'First dam in the Chambal cascade'
    },
    'Ramgarh Dam': {
        river: 'Banganga',
        district: 'Jaipur',
        significance: 'Drinking water for Jaipur',
        completion: 1903,
        notes: 'Historic dam, important water source'
    }
};

/**
 * RIVER BASIN STATISTICS
 */
export const BASIN_STATISTICS = {
    drainage_types: {
        'Bay of Bengal': {
            percentage: 'Approx 25%',
            rivers: ['Chambal', 'Banas', 'Banganga'],
            via: 'Yamuna-Ganga system',
            notes: 'Eastern and northeastern flow'
        },
        'Arabian Sea': {
            percentage: 'Approx 15%',
            rivers: ['Mahi', 'Sabarmati', 'West Banas', 'Luni (partially)'],
            via: 'Gulf of Khambhat and Rann of Kutch',
            notes: 'Southern and southwestern flow'
        },
        'Inland Drainage': {
            percentage: '60.2%',
            rivers: ['Ghaggar', 'Kantli', 'Sahibi', 'Ruparel', 'Luni (partially)'],
            destination: 'Desert sands, salt lakes',
            notes: 'Largest drainage type; no outlet to sea'
        }
    },
    basin_ranking_by_area: [
        { rank: 1, name: 'Banas', area_sqkm: 45833 },
        { rank: 2, name: 'Luni', area_sqkm: 37363 },
        { rank: 3, name: 'Chambal', area_sqkm: 31360 },
        { rank: 4, name: 'Mahi', area_sqkm: 16985 },
        { rank: 5, name: 'Banganga', area_sqkm: 8878 },
        { rank: 6, name: 'Sabarmati', area_sqkm: 4164 }
    ]
};

/**
 * SPECIAL RIVER CHARACTERISTICS
 */
export const RIVER_SPECIAL_FEATURES = {
    'Chambal': [
        'Only perennial river in Rajasthan',
        'Forms natural boundary between Rajasthan and Madhya Pradesh',
        'Enters Rajasthan at Chaurasigarh (Chittorgarh)',
        'Four major dams: Gandhi Sagar, Rana Pratap Sagar, Jawahar Sagar, Kota Barrage',
        'Known for gharials and dolphins',
        'National Chambal Sanctuary'
    ],
    'Banas': [
        'Largest basin in Rajasthan (45,833 sq km)',
        'Known as "Vana Ki Asha" (Hope of the Forest)',
        'Flows entirely within Rajasthan',
        'Originates from Khamnor Hills, Rajsamand',
        'Meets Chambal at Sawai Madhopur',
        'Bisalpur Dam provides drinking water to Jaipur and Ajmer'
    ],
    'Luni': [
        'Second largest basin (37,363 sq km)',
        'Known as "Lavanavari" (Salt River)',
        'Water is fresh up to Balotra, becomes saline thereafter',
        'Originates from Nag Pahar, Ajmer',
        'Ends in Rann of Kutch',
        'Jawai is its largest tributary'
    ],
    'Mahi': [
        'Enters Rajasthan from north (Madhya Pradesh)',
        'Turns southwest into Gujarat',
        'Mahi Bajaj Sagar Dam for hydroelectric power',
        'Jakham tributary has highest dam in Rajasthan (81m)',
        'Flows to Gulf of Khambhat'
    ],
    'Banganga': [
        'Originates from Bairath Hills, Jaipur',
        'Frequently dries up before reaching Yamuna',
        'Sometimes classified as inland drainage',
        'Ramgarh Dam is important for Jaipur water supply',
        'Flows through Jaipur, Dausa, Bharatpur'
    ],
    'Ghaggar': [
        'Known as "Dead River" or "Naali"',
        'Seasonal river',
        'Flows through Hanumangarh and Ganganagar',
        'Believed to be ancient Saraswati River',
        'Inland drainage - ends in desert'
    ],
    'Sahibi': [
        'Originates from Sewar hills (Jaipur)',
        'Flows north through Alwar into Haryana',
        'Also known as Sota-Sabi',
        'Inland drainage system',
        'Important for Alwar region'
    ]
};

/**
 * INTER-BASIN TRANSFER PROJECTS
 */
export const WATER_TRANSFER_PROJECTS = {
    'Parvati-Kalisindh-Chambal Link': {
        purpose: 'Water transfer between basins',
        status: 'Proposed/Under consideration',
        benefit: 'Enhance water availability in Chambal basin'
    },
    'Brahmani-Banas Link': {
        purpose: 'Divert water into Bisalpur Dam',
        status: 'Implemented',
        benefit: 'Increase drinking water supply for Jaipur and Ajmer'
    }
};

export default {
    RAJASTHAN_LAKES,
    RIVER_TRIBUTARIES,
    SPECIAL_DAMS_INFO,
    BASIN_STATISTICS,
    RIVER_SPECIAL_FEATURES,
    WATER_TRANSFER_PROJECTS
};
