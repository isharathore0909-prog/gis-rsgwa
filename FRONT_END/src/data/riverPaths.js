// Rajasthan River Paths - Accurate geographical data
// Source: Rivers, Lakes and Dams of Rajasthan (rajras.in) + Wikipedia Kartographer
// Updated: January 2026
// Coordinates are [lat, lng] pairs representing actual river courses

/**
 * RAJASTHAN DRAINAGE SYSTEM OVERVIEW:
 * - Arabian Sea Drainage: Mahi, Sabarmati, Luni (partially)
 * - Bay of Bengal Drainage: Chambal, Banas, Banganga (via Yamuna-Ganga)
 * - Inland Drainage (60.2%): Ghaggar, Kantli, Sahibi, Ruparel (end in desert/lakes)
 */

export const RAJASTHAN_RIVER_BASINS_INFO = {
    'Ganga': {
        name: 'Chambal Basin',
        area_sqkm: 31360,
        drainage: 'Bay of Bengal (via Yamuna-Ganga)',
        flow_direction: 'Northeast',
        perennial: true,
        source: 'Janapav Hills, Madhya Pradesh',
        mouth: 'Yamuna River',
        districts: ['Chittorgarh', 'Kota', 'Bundi', 'Sawai Madhopur', 'Karauli', 'Dholpur'],
        major_dams: ['Gandhi Sagar', 'Rana Pratap Sagar', 'Jawahar Sagar', 'Kota Barrage'],
        notes: 'Only perennial river in Rajasthan; forms boundary between Rajasthan and MP'
    },
    'Banas': {
        name: 'Banas Basin',
        area_sqkm: 45833,
        drainage: 'Bay of Bengal (via Chambal-Yamuna-Ganga)',
        flow_direction: 'Northeast',
        perennial: false,
        source: 'Khamnor Hills, Rajsamand',
        mouth: 'Chambal River at Sawai Madhopur',
        districts: ['Rajsamand', 'Bhilwara', 'Tonk', 'Ajmer', 'Sawai Madhopur'],
        major_dams: ['Bisalpur Dam', 'Matrakundia Dam', 'Nand Samand Dam'],
        notes: 'Largest basin in Rajasthan; known as "Hope of the Forest" (Vana Ki Asha); flows entirely within Rajasthan'
    },
    'Mahi': {
        name: 'Mahi Basin',
        area_sqkm: 16985,
        drainage: 'Arabian Sea (Gulf of Khambhat)',
        flow_direction: 'Southwest',
        perennial: false,
        source: 'Dhar, Madhya Pradesh',
        mouth: 'Gulf of Khambhat',
        districts: ['Banswara', 'Dungarpur'],
        major_dams: ['Mahi Bajaj Sagar Dam'],
        notes: 'Enters Rajasthan from north, turns southwest into Gujarat'
    },
    'West flowing rivers of Kutch and Saurashtra including Luni': {
        name: 'Luni Basin',
        area_sqkm: 37363,
        drainage: 'Inland/Arabian Sea (Rann of Kutch)',
        flow_direction: 'Southwest',
        perennial: false,
        source: 'Nag Pahar, Ajmer',
        mouth: 'Rann of Kutch',
        districts: ['Ajmer', 'Pali', 'Jodhpur', 'Barmer', 'Jalore'],
        major_dams: ['Jawai Dam', 'Jaswant Sagar'],
        notes: 'Known as "Lavanavari" (Salt River); water fresh up to Balotra, becomes saline thereafter'
    },
    'Banganga': {
        name: 'Banganga Basin',
        area_sqkm: 8878,
        drainage: 'Bay of Bengal (via Yamuna-Ganga)',
        flow_direction: 'East',
        perennial: false,
        source: 'Bairath Hills, Jaipur',
        mouth: 'Yamuna River (often dries up)',
        districts: ['Jaipur', 'Dausa', 'Bharatpur'],
        major_dams: ['Ramgarh Dam'],
        notes: 'Frequently dries up before reaching Yamuna; sometimes classified as inland drainage'
    },
    'Sabarmati': {
        name: 'Sabarmati Basin',
        area_sqkm: 4164,
        drainage: 'Arabian Sea (Gulf of Khambhat)',
        flow_direction: 'South',
        perennial: false,
        source: 'Aravalli Hills, Udaipur',
        mouth: 'Gulf of Khambhat',
        districts: ['Udaipur'],
        major_dams: ['Sei Diversion Dam'],
        notes: 'Small basin in Rajasthan; major flow through Gujarat'
    },
    'Area of inland drainage of Rajasthan': {
        name: 'Inland Drainage',
        area_sqkm: 'Variable',
        drainage: 'Inland (no outlet to sea)',
        flow_direction: 'Variable',
        perennial: false,
        source: 'Multiple sources',
        mouth: 'Desert sands/lakes',
        districts: ['Hanumangarh', 'Ganganagar', 'Sikar', 'Jhunjhunu', 'Churu'],
        major_dams: [],
        notes: 'Includes Ghaggar (Dead River), Sahibi, Kantli, Ruparel; 60.2% of Rajasthan drainage'
    }
};

export const RAJASTHAN_RIVER_PATHS = {
    // CHAMBAL RIVER - Bay of Bengal Drainage (via Yamuna-Ganga)
    // Basin Area: 31,360 sq km | Flow: NORTHEAST | Only Perennial River
    // Enters at Chaurasigarh (Chittorgarh), forms Rajasthan-MP boundary
    'Ganga': [
        [22.45000, 75.51600], // Source (Janapav Hills, MP)
        [23.14000, 75.50800], // Lower MP Reach
        [24.45867, 75.50990], // Gandhi Sagar Dam (MP/Rajasthan border)
        [24.92000, 75.58000], // Chaurasigarh entry point (Chittorgarh)
        [25.02953, 75.64815], // Rana Pratap Sagar (Rawatbhata, Chittorgarh)
        [25.14504, 75.77335], // Jawahar Sagar & Kota Barrage (Kota)
        [25.91006, 76.73877], // Sawai Madhopur area (Banas confluence)
        [26.66000, 77.90600], // Dholpur area
        [26.49250, 79.25016], // Mouth (Confluence with Yamuna)
    ],

    // BANAS RIVER - Bay of Bengal Drainage (via Chambal)
    // Basin Area: 45,833 sq km (LARGEST) | Flow: NORTHEAST
    // Known as "Vana Ki Asha" (Hope of the Forest) - Flows entirely in Rajasthan
    'Banas': [
        [25.07000, 73.88000], // Source (Khamnor Hills, Rajsamand)
        [25.35000, 74.63000], // Nathdwara area (Nand Samand Dam)
        [25.43000, 74.64000], // Rajsamand
        [25.42000, 74.78000], // Chittorgarh (Matrakundia Dam)
        [25.78000, 75.63000], // Tonk (Bisalpur Dam - major drinking water source)
        [26.02000, 76.13000], // Sawai Madhopur
        [26.02000, 76.73000], // Confluence with Chambal
    ],

    // MAHI RIVER - Arabian Sea Drainage (Gulf of Khambhat)
    // Basin Area: 16,985 sq km | Flow: SOUTHWEST
    // Enters from north (MP), turns southwest into Gujarat
    'Mahi': [
        [22.63500, 75.02500], // Source (Dhar, MP)
        [23.62800, 74.54700], // Banswara (Mahi Bajaj Sagar Dam)
        [23.89000, 74.49000], // Dungarpur area
        [23.33000, 73.85000], // Kadana Dam area (Gujarat)
        [22.51000, 73.11000], // Near Vadodara
        [22.21300, 72.76600], // Mouth (Gulf of Khambhat)
    ],

    // LUNI RIVER - Inland/Arabian Sea Drainage (Rann of Kutch)
    // Basin Area: 37,363 sq km (2nd Largest) | Flow: SOUTHWEST
    // "Lavanavari" (Salt River) - Fresh up to Balotra, saline thereafter
    'West flowing rivers of Kutch and Saurashtra including Luni': [
        [26.40290, 74.64000], // Source (Nag Pahar, Ajmer)
        [26.47200, 74.37200], // Govindgarh
        [26.45000, 73.31000], // Bilara (Jaswant Sagar Dam, Jodhpur)
        [26.03700, 73.06600], // Luni Town
        [25.75000, 72.39000], // Balotra (Barmer) - salinity change point
        [25.04000, 71.72000], // Gandhav (Jalore) - Jawai Dam tributary
        [24.75000, 71.27000], // Sanchor
        [24.35000, 71.14000], // Mouth (Rann of Kutch)
    ],

    // SABARMATI RIVER - Arabian Sea Drainage (Gulf of Khambhat)
    // Basin Area: 4,164 sq km | Flow: SOUTH
    // Small basin in Rajasthan, major flow through Gujarat
    'Sabarmati': [
        [24.58327, 73.30487], // Source (Aravalli Hills, Udaipur)
        [24.57956, 73.28549], // Udaipur Reach
        [24.34223, 73.10740], // Rajasthan-Gujarat Border Area
        [24.00806, 72.85648], // Upper Reach (Dungarpur border)
        [23.50998, 72.82383], // Dharoi Dam Area
        [23.11916, 72.64813], // Gandhinagar
        [23.01266, 72.57539], // Ahmedabad
        [22.65398, 72.53799], // Lower Reach (Gujarat Plains)
        [22.27131, 72.39389], // Mouth (Gulf of Khambhat)
    ],

    // BANGANGA RIVER - Bay of Bengal Drainage (via Yamuna-Ganga)
    // Basin Area: 8,878 sq km | Flow: EAST
    // Often dries up before reaching Yamuna - sometimes classified as inland drainage
    'Banganga': [
        [27.42000, 76.18000], // Source (Bairath Hills, Jaipur)
        [27.05000, 76.01000], // Jamwa Ramgarh Reservoir
        [26.89000, 76.33000], // Dausa area
        [27.10000, 77.40000], // Bharatpur area
        [27.00000, 78.30000], // Confluence (near Fatehabad, UP) - often dry
    ],

    // INLAND DRAINAGE - No outlet to sea (60.2% of Rajasthan)
    // Includes: Ghaggar (Dead River), Sahibi, Kantli, Ruparel
    // Terminates in desert sands or lakes
    'Area of inland drainage of Rajasthan': [
        [29.50000, 74.50000], // Ghaggar source area (Hanumangarh/Ganganagar)
        [27.50000, 75.50000], // Sahibi River area (Alwar)
        [27.00000, 73.00000], // Northern desert area
        [26.50000, 72.50000], // Central desert
        [26.00000, 72.00000], // Western desert (Thar)
    ]
};

// Function to get river path for a specific basin
export const getRiverPathForBasin = (basinName) => {
    return RAJASTHAN_RIVER_PATHS[basinName] || [];
};

// Function to find the nearest segment of river path from a dam location
export const getNearestRiverSegment = (damLat, damLng, basinName, segmentLength = 6) => {
    const fullPath = getRiverPathForBasin(basinName);
    if (!fullPath || fullPath.length === 0) return [];

    // Find the closest point on the river path
    let minDistance = Infinity;
    let closestIndex = 0;

    fullPath.forEach((point, index) => {
        const distance = Math.sqrt(
            Math.pow(point[0] - damLat, 2) +
            Math.pow(point[1] - damLng, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    // Return a segment of the path starting from the closest point
    const endIndex = Math.min(closestIndex + segmentLength, fullPath.length);
    return fullPath.slice(closestIndex, endIndex);
};
