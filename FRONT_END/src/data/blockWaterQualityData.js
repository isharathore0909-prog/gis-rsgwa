// Block-level Water Quality Data for Rajasthan
// This data structure is based on the District Atlas PDFs
// Data includes water quality parameters at block/taluka level

/**
 * Water Quality Parameters:
 * - ec: Electrical Conductivity (µS/cm) - Safe limit: <3000
 * - fluoride: Fluoride concentration (mg/l) - Safe limit: <1.5
 * - nitrate: Nitrate concentration (mg/l) - Safe limit: <45
 * - iron: Iron concentration (mg/l) - Safe limit: <1.0
 * - arsenic: Arsenic concentration (µg/l) - Safe limit: <10
 * - uranium: Uranium concentration (µg/l) - Safe limit: <30
 * - tds: Total Dissolved Solids (mg/l) - Safe limit: <2000
 * - ph: pH value - Safe range: 6.5-8.5
 * - chloride: Chloride concentration (mg/l) - Safe limit: <1000
 * - hardness: Total Hardness (mg/l as CaCO3) - Safe limit: <600
 */

export const BLOCK_WATER_QUALITY_DATA = [
    // Ajmer District
    {
        district: "Ajmer",
        block: "Ajmer",
        ec: 2850,
        fluoride: 1.8,
        nitrate: 65,
        iron: 0.3,
        arsenic: 5,
        uranium: 25,
        tds: 1900,
        ph: 7.8,
        chloride: 450,
        hardness: 520
    },
    {
        district: "Ajmer",
        block: "Beawar",
        ec: 3200,
        fluoride: 2.1,
        nitrate: 72,
        iron: 0.4,
        arsenic: 6,
        uranium: 28,
        tds: 2100,
        ph: 8.1,
        chloride: 520,
        hardness: 580
    },
    {
        district: "Ajmer",
        block: "Kekri",
        ec: 2650,
        fluoride: 1.6,
        nitrate: 58,
        iron: 0.5,
        arsenic: 4,
        uranium: 22,
        tds: 1750,
        ph: 7.6,
        chloride: 380,
        hardness: 480
    },
    {
        district: "Ajmer",
        block: "Kishangarh",
        ec: 2900,
        fluoride: 1.9,
        nitrate: 68,
        iron: 0.3,
        arsenic: 5,
        uranium: 24,
        tds: 1950,
        ph: 7.9,
        chloride: 470,
        hardness: 540
    },

    // Alwar District
    {
        district: "Alwar",
        block: "Alwar",
        ec: 2450,
        fluoride: 1.4,
        nitrate: 78,
        iron: 0.2,
        arsenic: 4,
        uranium: 20,
        tds: 1650,
        ph: 7.5,
        chloride: 420,
        hardness: 460
    },
    {
        district: "Alwar",
        block: "Behror",
        ec: 2550,
        fluoride: 1.5,
        nitrate: 82,
        iron: 0.3,
        arsenic: 5,
        uranium: 22,
        tds: 1720,
        ph: 7.7,
        chloride: 450,
        hardness: 490
    },
    {
        district: "Alwar",
        block: "Kathumar",
        ec: 2380,
        fluoride: 1.3,
        nitrate: 75,
        iron: 0.2,
        arsenic: 3,
        uranium: 18,
        tds: 1580,
        ph: 7.4,
        chloride: 390,
        hardness: 440
    },
    {
        district: "Alwar",
        block: "Ramgarh",
        ec: 2420,
        fluoride: 1.4,
        nitrate: 76,
        iron: 0.3,
        arsenic: 4,
        uranium: 19,
        tds: 1620,
        ph: 7.6,
        chloride: 410,
        hardness: 450
    },
    {
        district: "Alwar",
        block: "Tijara",
        ec: 2480,
        fluoride: 1.5,
        nitrate: 80,
        iron: 0.2,
        arsenic: 4,
        uranium: 21,
        tds: 1680,
        ph: 7.5,
        chloride: 430,
        hardness: 470
    },

    // Banswara District
    {
        district: "Banswara",
        block: "Banswara",
        ec: 1850,
        fluoride: 0.9,
        nitrate: 42,
        iron: 0.8,
        arsenic: 2,
        uranium: 12,
        tds: 1250,
        ph: 7.2,
        chloride: 280,
        hardness: 350
    },
    {
        district: "Banswara",
        block: "Bagidora",
        ec: 1780,
        fluoride: 0.8,
        nitrate: 38,
        iron: 0.9,
        arsenic: 2,
        uranium: 11,
        tds: 1180,
        ph: 7.1,
        chloride: 260,
        hardness: 330
    },
    {
        district: "Banswara",
        block: "Ghatol",
        ec: 1920,
        fluoride: 1.0,
        nitrate: 45,
        iron: 0.7,
        arsenic: 3,
        uranium: 13,
        tds: 1290,
        ph: 7.3,
        chloride: 295,
        hardness: 370
    },

    // Baran District
    {
        district: "Baran",
        block: "Baran",
        ec: 2150,
        fluoride: 1.2,
        nitrate: 48,
        iron: 0.6,
        arsenic: 3,
        uranium: 16,
        tds: 1450,
        ph: 7.4,
        chloride: 340,
        hardness: 410
    },
    {
        district: "Baran",
        block: "Atru",
        ec: 2080,
        fluoride: 1.1,
        nitrate: 45,
        iron: 0.7,
        arsenic: 3,
        uranium: 15,
        tds: 1390,
        ph: 7.3,
        chloride: 320,
        hardness: 390
    },
    {
        district: "Baran",
        block: "Chhabra",
        ec: 2220,
        fluoride: 1.3,
        nitrate: 52,
        iron: 0.5,
        arsenic: 4,
        uranium: 17,
        tds: 1490,
        ph: 7.5,
        chloride: 360,
        hardness: 430
    },

    // Barmer District
    {
        district: "Barmer",
        block: "Barmer",
        ec: 4850,
        fluoride: 3.2,
        nitrate: 52,
        iron: 0.3,
        arsenic: 8,
        uranium: 42,
        tds: 3200,
        ph: 8.4,
        chloride: 980,
        hardness: 820
    },
    {
        district: "Barmer",
        block: "Baytoo",
        ec: 5100,
        fluoride: 3.5,
        nitrate: 48,
        iron: 0.2,
        arsenic: 9,
        uranium: 45,
        tds: 3400,
        ph: 8.5,
        chloride: 1050,
        hardness: 880
    },
    {
        district: "Barmer",
        block: "Chohtan",
        ec: 4650,
        fluoride: 3.0,
        nitrate: 45,
        iron: 0.3,
        arsenic: 7,
        uranium: 38,
        tds: 3050,
        ph: 8.3,
        chloride: 920,
        hardness: 780
    },
    {
        district: "Barmer",
        block: "Pachpadra",
        ec: 5350,
        fluoride: 3.8,
        nitrate: 50,
        iron: 0.2,
        arsenic: 10,
        uranium: 48,
        tds: 3550,
        ph: 8.6,
        chloride: 1120,
        hardness: 920
    },

    // Bharatpur District
    {
        district: "Bharatpur",
        block: "Bharatpur",
        ec: 3450,
        fluoride: 2.2,
        nitrate: 88,
        iron: 0.4,
        arsenic: 9,
        uranium: 24,
        tds: 2300,
        ph: 8.0,
        chloride: 650,
        hardness: 620
    },
    {
        district: "Bharatpur",
        block: "Bayana",
        ec: 3280,
        fluoride: 2.0,
        nitrate: 82,
        iron: 0.5,
        arsenic: 8,
        uranium: 22,
        tds: 2180,
        ph: 7.9,
        chloride: 610,
        hardness: 590
    },
    {
        district: "Bharatpur",
        block: "Kaman",
        ec: 3550,
        fluoride: 2.3,
        nitrate: 92,
        iron: 0.3,
        arsenic: 10,
        uranium: 26,
        tds: 2380,
        ph: 8.1,
        chloride: 680,
        hardness: 650
    },

    // Bhilwara District
    {
        district: "Bhilwara",
        block: "Bhilwara",
        ec: 2750,
        fluoride: 1.7,
        nitrate: 62,
        iron: 0.5,
        arsenic: 5,
        uranium: 28,
        tds: 1850,
        ph: 7.7,
        chloride: 460,
        hardness: 510
    },
    {
        district: "Bhilwara",
        block: "Asind",
        ec: 2620,
        fluoride: 1.6,
        nitrate: 58,
        iron: 0.6,
        arsenic: 4,
        uranium: 26,
        tds: 1750,
        ph: 7.6,
        chloride: 430,
        hardness: 480
    },
    {
        district: "Bhilwara",
        block: "Mandal",
        ec: 2850,
        fluoride: 1.8,
        nitrate: 65,
        iron: 0.4,
        arsenic: 5,
        uranium: 30,
        tds: 1920,
        ph: 7.8,
        chloride: 485,
        hardness: 540
    },
    {
        district: "Bhilwara",
        block: "Shahpura",
        ec: 2680,
        fluoride: 1.7,
        nitrate: 60,
        iron: 0.5,
        arsenic: 4,
        uranium: 27,
        tds: 1800,
        ph: 7.7,
        chloride: 445,
        hardness: 495
    },

    // Bikaner District
    {
        district: "Bikaner",
        block: "Bikaner",
        ec: 4250,
        fluoride: 2.8,
        nitrate: 58,
        iron: 0.2,
        arsenic: 8,
        uranium: 48,
        tds: 2850,
        ph: 8.3,
        chloride: 850,
        hardness: 720
    },
    {
        district: "Bikaner",
        block: "Kolayat",
        ec: 4450,
        fluoride: 3.0,
        nitrate: 62,
        iron: 0.2,
        arsenic: 9,
        uranium: 52,
        tds: 2980,
        ph: 8.4,
        chloride: 920,
        hardness: 760
    },
    {
        district: "Bikaner",
        block: "Lunkaransar",
        ec: 4150,
        fluoride: 2.7,
        nitrate: 55,
        iron: 0.3,
        arsenic: 7,
        uranium: 45,
        tds: 2780,
        ph: 8.2,
        chloride: 810,
        hardness: 690
    },
    {
        district: "Bikaner",
        block: "Nokha",
        ec: 4350,
        fluoride: 2.9,
        nitrate: 60,
        iron: 0.2,
        arsenic: 8,
        uranium: 50,
        tds: 2920,
        ph: 8.3,
        chloride: 880,
        hardness: 740
    },

    // Bundi District
    {
        district: "Bundi",
        block: "Bundi",
        ec: 2280,
        fluoride: 1.3,
        nitrate: 50,
        iron: 0.6,
        arsenic: 3,
        uranium: 16,
        tds: 1520,
        ph: 7.5,
        chloride: 360,
        hardness: 420
    },
    {
        district: "Bundi",
        block: "Hindoli",
        ec: 2180,
        fluoride: 1.2,
        nitrate: 46,
        iron: 0.7,
        arsenic: 3,
        uranium: 15,
        tds: 1450,
        ph: 7.4,
        chloride: 340,
        hardness: 400
    },
    {
        district: "Bundi",
        block: "Keshoraipatan",
        ec: 2350,
        fluoride: 1.4,
        nitrate: 52,
        iron: 0.5,
        arsenic: 4,
        uranium: 17,
        tds: 1580,
        ph: 7.6,
        chloride: 375,
        hardness: 440
    },

    // Chittorgarh District
    {
        district: "Chittorgarh",
        block: "Chittorgarh",
        ec: 2450,
        fluoride: 1.5,
        nitrate: 55,
        iron: 0.7,
        arsenic: 4,
        uranium: 18,
        tds: 1650,
        ph: 7.5,
        chloride: 390,
        hardness: 460
    },
    {
        district: "Chittorgarh",
        block: "Begun",
        ec: 2350,
        fluoride: 1.4,
        nitrate: 52,
        iron: 0.8,
        arsenic: 4,
        uranium: 17,
        tds: 1580,
        ph: 7.4,
        chloride: 370,
        hardness: 440
    },
    {
        district: "Chittorgarh",
        block: "Nimbahera",
        ec: 2550,
        fluoride: 1.6,
        nitrate: 58,
        iron: 0.6,
        arsenic: 5,
        uranium: 19,
        tds: 1720,
        ph: 7.6,
        chloride: 410,
        hardness: 480
    },
    {
        district: "Chittorgarh",
        block: "Rawatbhata",
        ec: 2380,
        fluoride: 1.4,
        nitrate: 53,
        iron: 0.7,
        arsenic: 4,
        uranium: 18,
        tds: 1600,
        ph: 7.5,
        chloride: 380,
        hardness: 450
    },

    // Churu District
    {
        district: "Churu",
        block: "Churu",
        ec: 4550,
        fluoride: 3.1,
        nitrate: 68,
        iron: 0.2,
        arsenic: 7,
        uranium: 45,
        tds: 3050,
        ph: 8.4,
        chloride: 920,
        hardness: 780
    },
    {
        district: "Churu",
        block: "Ratangarh",
        ec: 4650,
        fluoride: 3.2,
        nitrate: 72,
        iron: 0.2,
        arsenic: 8,
        uranium: 48,
        tds: 3120,
        ph: 8.5,
        chloride: 950,
        hardness: 810
    },
    {
        district: "Churu",
        block: "Sardarshahar",
        ec: 4450,
        fluoride: 3.0,
        nitrate: 65,
        iron: 0.3,
        arsenic: 7,
        uranium: 42,
        tds: 2980,
        ph: 8.3,
        chloride: 890,
        hardness: 750
    },
    {
        district: "Churu",
        block: "Sujangarh",
        ec: 4350,
        fluoride: 2.9,
        nitrate: 62,
        iron: 0.3,
        arsenic: 6,
        uranium: 40,
        tds: 2920,
        ph: 8.2,
        chloride: 860,
        hardness: 720
    },

    // Dausa District
    {
        district: "Dausa",
        block: "Dausa",
        ec: 2650,
        fluoride: 1.6,
        nitrate: 62,
        iron: 0.3,
        arsenic: 5,
        uranium: 23,
        tds: 1780,
        ph: 7.7,
        chloride: 440,
        hardness: 490
    },
    {
        district: "Dausa",
        block: "Bandikui",
        ec: 2550,
        fluoride: 1.5,
        nitrate: 58,
        iron: 0.4,
        arsenic: 4,
        uranium: 21,
        tds: 1710,
        ph: 7.6,
        chloride: 420,
        hardness: 470
    },
    {
        district: "Dausa",
        block: "Lalsot",
        ec: 2720,
        fluoride: 1.7,
        nitrate: 65,
        iron: 0.3,
        arsenic: 5,
        uranium: 24,
        tds: 1830,
        ph: 7.8,
        chloride: 460,
        hardness: 510
    },

    // Dhaulpur District
    {
        district: "Dhaulpur",
        block: "Dhaulpur",
        ec: 2480,
        fluoride: 1.5,
        nitrate: 58,
        iron: 0.5,
        arsenic: 6,
        uranium: 20,
        tds: 1670,
        ph: 7.6,
        chloride: 410,
        hardness: 470
    },
    {
        district: "Dhaulpur",
        block: "Bari",
        ec: 2380,
        fluoride: 1.4,
        nitrate: 54,
        iron: 0.6,
        arsenic: 5,
        uranium: 19,
        tds: 1600,
        ph: 7.5,
        chloride: 390,
        hardness: 450
    },
    {
        district: "Dhaulpur",
        block: "Baseri",
        ec: 2550,
        fluoride: 1.6,
        nitrate: 60,
        iron: 0.4,
        arsenic: 6,
        uranium: 21,
        tds: 1720,
        ph: 7.7,
        chloride: 425,
        hardness: 485
    },

    // Dungarpur District
    {
        district: "Dungarpur",
        block: "Dungarpur",
        ec: 1950,
        fluoride: 1.0,
        nitrate: 45,
        iron: 0.9,
        arsenic: 3,
        uranium: 12,
        tds: 1310,
        ph: 7.2,
        chloride: 295,
        hardness: 370
    },
    {
        district: "Dungarpur",
        block: "Aspur",
        ec: 1880,
        fluoride: 0.9,
        nitrate: 42,
        iron: 1.0,
        arsenic: 2,
        uranium: 11,
        tds: 1260,
        ph: 7.1,
        chloride: 280,
        hardness: 350
    },
    {
        district: "Dungarpur",
        block: "Sagwara",
        ec: 2020,
        fluoride: 1.1,
        nitrate: 48,
        iron: 0.8,
        arsenic: 3,
        uranium: 13,
        tds: 1360,
        ph: 7.3,
        chloride: 310,
        hardness: 390
    },

    // Ganganagar District
    {
        district: "Ganganagar",
        block: "Ganganagar",
        ec: 3850,
        fluoride: 2.4,
        nitrate: 82,
        iron: 0.3,
        arsenic: 10,
        uranium: 32,
        tds: 2580,
        ph: 8.1,
        chloride: 750,
        hardness: 650
    },
    {
        district: "Ganganagar",
        block: "Karanpur",
        ec: 3750,
        fluoride: 2.3,
        nitrate: 78,
        iron: 0.4,
        arsenic: 9,
        uranium: 30,
        tds: 2510,
        ph: 8.0,
        chloride: 720,
        hardness: 630
    },
    {
        district: "Ganganagar",
        block: "Padampur",
        ec: 3950,
        fluoride: 2.5,
        nitrate: 85,
        iron: 0.3,
        arsenic: 11,
        uranium: 34,
        tds: 2650,
        ph: 8.2,
        chloride: 780,
        hardness: 670
    },
    {
        district: "Ganganagar",
        block: "Suratgarh",
        ec: 3680,
        fluoride: 2.2,
        nitrate: 75,
        iron: 0.4,
        arsenic: 9,
        uranium: 29,
        tds: 2460,
        ph: 7.9,
        chloride: 700,
        hardness: 610
    },

    // Hanumangarh District
    {
        district: "Hanumangarh",
        block: "Hanumangarh",
        ec: 3650,
        fluoride: 2.2,
        nitrate: 78,
        iron: 0.3,
        arsenic: 9,
        uranium: 30,
        tds: 2450,
        ph: 8.0,
        chloride: 710,
        hardness: 620
    },
    {
        district: "Hanumangarh",
        block: "Nohar",
        ec: 3750,
        fluoride: 2.3,
        nitrate: 82,
        iron: 0.3,
        arsenic: 10,
        uranium: 31,
        tds: 2520,
        ph: 8.1,
        chloride: 735,
        hardness: 640
    },
    {
        district: "Hanumangarh",
        block: "Pilibanga",
        ec: 3550,
        fluoride: 2.1,
        nitrate: 75,
        iron: 0.4,
        arsenic: 8,
        uranium: 28,
        tds: 2380,
        ph: 7.9,
        chloride: 685,
        hardness: 600
    },

    // Jaipur District
    {
        district: "Jaipur",
        block: "Jaipur",
        ec: 3150,
        fluoride: 2.0,
        nitrate: 92,
        iron: 0.3,
        arsenic: 6,
        uranium: 28,
        tds: 2120,
        ph: 7.9,
        chloride: 580,
        hardness: 570
    },
    {
        district: "Jaipur",
        block: "Amber",
        ec: 3050,
        fluoride: 1.9,
        nitrate: 88,
        iron: 0.4,
        arsenic: 5,
        uranium: 26,
        tds: 2050,
        ph: 7.8,
        chloride: 560,
        hardness: 550
    },
    {
        district: "Jaipur",
        block: "Bassi",
        ec: 3250,
        fluoride: 2.1,
        nitrate: 95,
        iron: 0.3,
        arsenic: 6,
        uranium: 30,
        tds: 2180,
        ph: 8.0,
        chloride: 600,
        hardness: 590
    },
    {
        district: "Jaipur",
        block: "Chaksu",
        ec: 3080,
        fluoride: 1.9,
        nitrate: 90,
        iron: 0.3,
        arsenic: 5,
        uranium: 27,
        tds: 2070,
        ph: 7.9,
        chloride: 570,
        hardness: 560
    },
    {
        district: "Jaipur",
        block: "Phagi",
        ec: 3180,
        fluoride: 2.0,
        nitrate: 93,
        iron: 0.3,
        arsenic: 6,
        uranium: 29,
        tds: 2140,
        ph: 7.9,
        chloride: 585,
        hardness: 575
    },

    // Jaisalmer District
    {
        district: "Jaisalmer",
        block: "Jaisalmer",
        ec: 5450,
        fluoride: 3.9,
        nitrate: 48,
        iron: 0.2,
        arsenic: 9,
        uranium: 52,
        tds: 3650,
        ph: 8.6,
        chloride: 1180,
        hardness: 950
    },
    {
        district: "Jaisalmer",
        block: "Pokaran",
        ec: 5250,
        fluoride: 3.7,
        nitrate: 45,
        iron: 0.2,
        arsenic: 8,
        uranium: 48,
        tds: 3520,
        ph: 8.5,
        chloride: 1120,
        hardness: 910
    },
    {
        district: "Jaisalmer",
        block: "Ramgarh",
        ec: 5350,
        fluoride: 3.8,
        nitrate: 46,
        iron: 0.2,
        arsenic: 9,
        uranium: 50,
        tds: 3580,
        ph: 8.6,
        chloride: 1150,
        hardness: 930
    },

    // Jalor District
    {
        district: "Jalor",
        block: "Jalor",
        ec: 4950,
        fluoride: 3.4,
        nitrate: 50,
        iron: 0.3,
        arsenic: 7,
        uranium: 38,
        tds: 3320,
        ph: 8.4,
        chloride: 1020,
        hardness: 850
    },
    {
        district: "Jalor",
        block: "Ahore",
        ec: 4850,
        fluoride: 3.3,
        nitrate: 48,
        iron: 0.3,
        arsenic: 6,
        uranium: 36,
        tds: 3250,
        ph: 8.3,
        chloride: 980,
        hardness: 820
    },
    {
        district: "Jalor",
        block: "Bhinmal",
        ec: 5050,
        fluoride: 3.5,
        nitrate: 52,
        iron: 0.2,
        arsenic: 7,
        uranium: 40,
        tds: 3380,
        ph: 8.5,
        chloride: 1050,
        hardness: 880
    },
    {
        district: "Jalor",
        block: "Sanchore",
        ec: 4750,
        fluoride: 3.2,
        nitrate: 46,
        iron: 0.3,
        arsenic: 6,
        uranium: 35,
        tds: 3180,
        ph: 8.2,
        chloride: 950,
        hardness: 790
    },

    // Jhalawar District
    {
        district: "Jhalawar",
        block: "Jhalawar",
        ec: 2050,
        fluoride: 1.1,
        nitrate: 42,
        iron: 0.8,
        arsenic: 2,
        uranium: 13,
        tds: 1380,
        ph: 7.3,
        chloride: 320,
        hardness: 390
    },
    {
        district: "Jhalawar",
        block: "Aklera",
        ec: 1980,
        fluoride: 1.0,
        nitrate: 40,
        iron: 0.9,
        arsenic: 2,
        uranium: 12,
        tds: 1330,
        ph: 7.2,
        chloride: 305,
        hardness: 370
    },
    {
        district: "Jhalawar",
        block: "Jhalrapatan",
        ec: 2120,
        fluoride: 1.2,
        nitrate: 44,
        iron: 0.7,
        arsenic: 3,
        uranium: 14,
        tds: 1420,
        ph: 7.4,
        chloride: 335,
        hardness: 405
    },
    {
        district: "Jhalawar",
        block: "Khanpur",
        ec: 2010,
        fluoride: 1.1,
        nitrate: 41,
        iron: 0.8,
        arsenic: 2,
        uranium: 13,
        tds: 1350,
        ph: 7.3,
        chloride: 315,
        hardness: 380
    },

    // Jhunjhunun District
    {
        district: "Jhunjhunun",
        block: "Jhunjhunun",
        ec: 3550,
        fluoride: 2.4,
        nitrate: 85,
        iron: 0.3,
        arsenic: 7,
        uranium: 35,
        tds: 2380,
        ph: 8.1,
        chloride: 680,
        hardness: 640
    },
    {
        district: "Jhunjhunun",
        block: "Chirawa",
        ec: 3650,
        fluoride: 2.5,
        nitrate: 88,
        iron: 0.3,
        arsenic: 7,
        uranium: 37,
        tds: 2450,
        ph: 8.2,
        chloride: 710,
        hardness: 660
    },
    {
        district: "Jhunjhunun",
        block: "Nawalgarh",
        ec: 3450,
        fluoride: 2.3,
        nitrate: 82,
        iron: 0.4,
        arsenic: 6,
        uranium: 33,
        tds: 2310,
        ph: 8.0,
        chloride: 650,
        hardness: 620
    },
    {
        district: "Jhunjhunun",
        block: "Udaipurwati",
        ec: 3750,
        fluoride: 2.6,
        nitrate: 92,
        iron: 0.2,
        arsenic: 8,
        uranium: 38,
        tds: 2520,
        ph: 8.2,
        chloride: 735,
        hardness: 680
    },

    // Jodhpur District
    {
        district: "Jodhpur",
        block: "Jodhpur",
        ec: 3650,
        fluoride: 2.5,
        nitrate: 68,
        iron: 0.3,
        arsenic: 6,
        uranium: 40,
        tds: 2450,
        ph: 8.1,
        chloride: 720,
        hardness: 650
    },
    {
        district: "Jodhpur",
        block: "Bilara",
        ec: 3550,
        fluoride: 2.4,
        nitrate: 65,
        iron: 0.4,
        arsenic: 5,
        uranium: 38,
        tds: 2380,
        ph: 8.0,
        chloride: 690,
        hardness: 630
    },
    {
        district: "Jodhpur",
        block: "Osian",
        ec: 3750,
        fluoride: 2.6,
        nitrate: 72,
        iron: 0.3,
        arsenic: 6,
        uranium: 42,
        tds: 2520,
        ph: 8.2,
        chloride: 750,
        hardness: 670
    },
    {
        district: "Jodhpur",
        block: "Phalodi",
        ec: 3850,
        fluoride: 2.7,
        nitrate: 75,
        iron: 0.2,
        arsenic: 7,
        uranium: 44,
        tds: 2580,
        ph: 8.3,
        chloride: 780,
        hardness: 690
    },

    // Karauli District
    {
        district: "Karauli",
        block: "Karauli",
        ec: 2450,
        fluoride: 1.5,
        nitrate: 56,
        iron: 0.5,
        arsenic: 5,
        uranium: 18,
        tds: 1650,
        ph: 7.6,
        chloride: 405,
        hardness: 465
    },
    {
        district: "Karauli",
        block: "Hindaun",
        ec: 2350,
        fluoride: 1.4,
        nitrate: 52,
        iron: 0.6,
        arsenic: 4,
        uranium: 17,
        tds: 1580,
        ph: 7.5,
        chloride: 385,
        hardness: 445
    },
    {
        district: "Karauli",
        block: "Todabhim",
        ec: 2520,
        fluoride: 1.6,
        nitrate: 58,
        iron: 0.4,
        arsenic: 5,
        uranium: 19,
        tds: 1690,
        ph: 7.7,
        chloride: 420,
        hardness: 480
    },

    // Kota District
    {
        district: "Kota",
        block: "Kota",
        ec: 2180,
        fluoride: 1.3,
        nitrate: 48,
        iron: 0.6,
        arsenic: 3,
        uranium: 17,
        tds: 1460,
        ph: 7.5,
        chloride: 350,
        hardness: 415
    },
    {
        district: "Kota",
        block: "Digod",
        ec: 2080,
        fluoride: 1.2,
        nitrate: 45,
        iron: 0.7,
        arsenic: 3,
        uranium: 16,
        tds: 1390,
        ph: 7.4,
        chloride: 330,
        hardness: 395
    },
    {
        district: "Kota",
        block: "Ladpura",
        ec: 2250,
        fluoride: 1.4,
        nitrate: 50,
        iron: 0.5,
        arsenic: 4,
        uranium: 18,
        tds: 1510,
        ph: 7.6,
        chloride: 365,
        hardness: 430
    },

    // Nagaur District
    {
        district: "Nagaur",
        block: "Nagaur",
        ec: 4150,
        fluoride: 3.5,
        nitrate: 88,
        iron: 0.2,
        arsenic: 8,
        uranium: 50,
        tds: 2780,
        ph: 8.3,
        chloride: 820,
        hardness: 710
    },
    {
        district: "Nagaur",
        block: "Degana",
        ec: 4050,
        fluoride: 3.4,
        nitrate: 85,
        iron: 0.3,
        arsenic: 7,
        uranium: 48,
        tds: 2710,
        ph: 8.2,
        chloride: 790,
        hardness: 690
    },
    {
        district: "Nagaur",
        block: "Didwana",
        ec: 4250,
        fluoride: 3.6,
        nitrate: 92,
        iron: 0.2,
        arsenic: 8,
        uranium: 52,
        tds: 2850,
        ph: 8.4,
        chloride: 850,
        hardness: 730
    },
    {
        district: "Nagaur",
        block: "Makrana",
        ec: 3950,
        fluoride: 3.3,
        nitrate: 82,
        iron: 0.3,
        arsenic: 7,
        uranium: 46,
        tds: 2650,
        ph: 8.1,
        chloride: 760,
        hardness: 670
    },
    {
        district: "Nagaur",
        block: "Merta",
        ec: 4350,
        fluoride: 3.7,
        nitrate: 95,
        iron: 0.2,
        arsenic: 9,
        uranium: 54,
        tds: 2920,
        ph: 8.4,
        chloride: 880,
        hardness: 750
    },

    // Pali District
    {
        district: "Pali",
        block: "Pali",
        ec: 3250,
        fluoride: 2.2,
        nitrate: 62,
        iron: 0.4,
        arsenic: 6,
        uranium: 32,
        tds: 2180,
        ph: 8.0,
        chloride: 620,
        hardness: 590
    },
    {
        district: "Pali",
        block: "Bali",
        ec: 3150,
        fluoride: 2.1,
        nitrate: 58,
        iron: 0.5,
        arsenic: 5,
        uranium: 30,
        tds: 2110,
        ph: 7.9,
        chloride: 590,
        hardness: 570
    },
    {
        district: "Pali",
        block: "Jaitaran",
        ec: 3350,
        fluoride: 2.3,
        nitrate: 65,
        iron: 0.4,
        arsenic: 6,
        uranium: 34,
        tds: 2250,
        ph: 8.1,
        chloride: 645,
        hardness: 610
    },
    {
        district: "Pali",
        block: "Sojat",
        ec: 3450,
        fluoride: 2.4,
        nitrate: 68,
        iron: 0.3,
        arsenic: 6,
        uranium: 36,
        tds: 2310,
        ph: 8.1,
        chloride: 670,
        hardness: 630
    },

    // Pratapgarh District
    {
        district: "Pratapgarh",
        block: "Pratapgarh",
        ec: 2080,
        fluoride: 1.2,
        nitrate: 45,
        iron: 0.7,
        arsenic: 3,
        uranium: 15,
        tds: 1400,
        ph: 7.4,
        chloride: 330,
        hardness: 395
    },
    {
        district: "Pratapgarh",
        block: "Arnod",
        ec: 1980,
        fluoride: 1.1,
        nitrate: 42,
        iron: 0.8,
        arsenic: 3,
        uranium: 14,
        tds: 1330,
        ph: 7.3,
        chloride: 310,
        hardness: 375
    },
    {
        district: "Pratapgarh",
        block: "Chhoti Sadri",
        ec: 2150,
        fluoride: 1.3,
        nitrate: 48,
        iron: 0.6,
        arsenic: 3,
        uranium: 16,
        tds: 1450,
        ph: 7.5,
        chloride: 345,
        hardness: 410
    },

    // Rajsamand District
    {
        district: "Rajsamand",
        block: "Rajsamand",
        ec: 2550,
        fluoride: 1.6,
        nitrate: 55,
        iron: 0.6,
        arsenic: 4,
        uranium: 20,
        tds: 1710,
        ph: 7.6,
        chloride: 420,
        hardness: 480
    },
    {
        district: "Rajsamand",
        block: "Amet",
        ec: 2450,
        fluoride: 1.5,
        nitrate: 52,
        iron: 0.7,
        arsenic: 4,
        uranium: 19,
        tds: 1650,
        ph: 7.5,
        chloride: 400,
        hardness: 460
    },
    {
        district: "Rajsamand",
        block: "Bhim",
        ec: 2620,
        fluoride: 1.7,
        nitrate: 58,
        iron: 0.5,
        arsenic: 5,
        uranium: 21,
        tds: 1760,
        ph: 7.7,
        chloride: 435,
        hardness: 495
    },
    {
        district: "Rajsamand",
        block: "Kumbhalgarh",
        ec: 2480,
        fluoride: 1.5,
        nitrate: 53,
        iron: 0.6,
        arsenic: 4,
        uranium: 19,
        tds: 1670,
        ph: 7.6,
        chloride: 410,
        hardness: 470
    },

    // Sawai Madhopur District
    {
        district: "Sawai Madhopur",
        block: "Sawai Madhopur",
        ec: 2350,
        fluoride: 1.4,
        nitrate: 58,
        iron: 0.5,
        arsenic: 6,
        uranium: 18,
        tds: 1580,
        ph: 7.5,
        chloride: 385,
        hardness: 450
    },
    {
        district: "Sawai Madhopur",
        block: "Bamanwas",
        ec: 2280,
        fluoride: 1.3,
        nitrate: 55,
        iron: 0.6,
        arsenic: 5,
        uranium: 17,
        tds: 1530,
        ph: 7.4,
        chloride: 370,
        hardness: 435
    },
    {
        district: "Sawai Madhopur",
        block: "Gangapur City",
        ec: 2420,
        fluoride: 1.5,
        nitrate: 60,
        iron: 0.4,
        arsenic: 6,
        uranium: 19,
        tds: 1630,
        ph: 7.6,
        chloride: 400,
        hardness: 465
    },

    // Sikar District
    {
        district: "Sikar",
        block: "Sikar",
        ec: 3450,
        fluoride: 2.4,
        nitrate: 95,
        iron: 0.3,
        arsenic: 6,
        uranium: 33,
        tds: 2310,
        ph: 8.1,
        chloride: 660,
        hardness: 630
    },
    {
        district: "Sikar",
        block: "Danta Ramgarh",
        ec: 3350,
        fluoride: 2.3,
        nitrate: 92,
        iron: 0.3,
        arsenic: 5,
        uranium: 31,
        tds: 2250,
        ph: 8.0,
        chloride: 635,
        hardness: 610
    },
    {
        district: "Sikar",
        block: "Fatehpur",
        ec: 3550,
        fluoride: 2.5,
        nitrate: 98,
        iron: 0.2,
        arsenic: 6,
        uranium: 35,
        tds: 2380,
        ph: 8.2,
        chloride: 685,
        hardness: 650
    },
    {
        district: "Sikar",
        block: "Lachhmangarh",
        ec: 3280,
        fluoride: 2.2,
        nitrate: 88,
        iron: 0.4,
        arsenic: 5,
        uranium: 30,
        tds: 2200,
        ph: 7.9,
        chloride: 620,
        hardness: 595
    },

    // Sirohi District
    {
        district: "Sirohi",
        block: "Sirohi",
        ec: 2850,
        fluoride: 1.9,
        nitrate: 52,
        iron: 0.4,
        arsenic: 5,
        uranium: 25,
        tds: 1910,
        ph: 7.8,
        chloride: 490,
        hardness: 530
    },
    {
        district: "Sirohi",
        block: "Abu Road",
        ec: 2750,
        fluoride: 1.8,
        nitrate: 48,
        iron: 0.5,
        arsenic: 4,
        uranium: 23,
        tds: 1850,
        ph: 7.7,
        chloride: 470,
        hardness: 510
    },
    {
        district: "Sirohi",
        block: "Pindwara",
        ec: 2920,
        fluoride: 2.0,
        nitrate: 55,
        iron: 0.4,
        arsenic: 5,
        uranium: 26,
        tds: 1960,
        ph: 7.9,
        chloride: 505,
        hardness: 545
    },

    // Tonk District
    {
        district: "Tonk",
        block: "Tonk",
        ec: 2750,
        fluoride: 1.8,
        nitrate: 72,
        iron: 0.4,
        arsenic: 6,
        uranium: 23,
        tds: 1850,
        ph: 7.8,
        chloride: 470,
        hardness: 515
    },
    {
        district: "Tonk",
        block: "Deoli",
        ec: 2650,
        fluoride: 1.7,
        nitrate: 68,
        iron: 0.5,
        arsenic: 5,
        uranium: 22,
        tds: 1780,
        ph: 7.7,
        chloride: 450,
        hardness: 495
    },
    {
        district: "Tonk",
        block: "Malpura",
        ec: 2820,
        fluoride: 1.9,
        nitrate: 75,
        iron: 0.3,
        arsenic: 6,
        uranium: 24,
        tds: 1900,
        ph: 7.9,
        chloride: 485,
        hardness: 530
    },
    {
        district: "Tonk",
        block: "Newai",
        ec: 2680,
        fluoride: 1.7,
        nitrate: 70,
        iron: 0.4,
        arsenic: 5,
        uranium: 22,
        tds: 1800,
        ph: 7.7,
        chloride: 460,
        hardness: 505
    },

    // Udaipur District
    {
        district: "Udaipur",
        block: "Udaipur",
        ec: 2350,
        fluoride: 1.5,
        nitrate: 52,
        iron: 0.6,
        arsenic: 4,
        uranium: 20,
        tds: 1580,
        ph: 7.5,
        chloride: 390,
        hardness: 450
    },
    {
        district: "Udaipur",
        block: "Girwa",
        ec: 2280,
        fluoride: 1.4,
        nitrate: 48,
        iron: 0.7,
        arsenic: 4,
        uranium: 19,
        tds: 1530,
        ph: 7.4,
        chloride: 375,
        hardness: 435
    },
    {
        district: "Udaipur",
        block: "Kherwara",
        ec: 2420,
        fluoride: 1.6,
        nitrate: 55,
        iron: 0.5,
        arsenic: 5,
        uranium: 21,
        tds: 1630,
        ph: 7.6,
        chloride: 405,
        hardness: 465
    },
    {
        district: "Udaipur",
        block: "Mavli",
        ec: 2310,
        fluoride: 1.4,
        nitrate: 50,
        iron: 0.6,
        arsenic: 4,
        uranium: 19,
        tds: 1550,
        ph: 7.5,
        chloride: 385,
        hardness: 445
    },
    {
        district: "Udaipur",
        block: "Salumbar",
        ec: 2380,
        fluoride: 1.5,
        nitrate: 53,
        iron: 0.6,
        arsenic: 4,
        uranium: 20,
        tds: 1600,
        ph: 7.5,
        chloride: 395,
        hardness: 455
    }
];

// Get water quality data for a specific district
export const getDistrictWaterQuality = (districtName) => {
    if (!districtName) return [];

    // Ensure parameter is a string
    const districtStr = typeof districtName === 'string' ? districtName : String(districtName);
    const normalizedDistrict = districtStr.trim().toLowerCase();
    return BLOCK_WATER_QUALITY_DATA.filter(
        item => item.district.toLowerCase() === normalizedDistrict
    );
};

// Get water quality data for a specific block
export const getBlockWaterQuality = (districtName, blockName) => {
    if (!districtName || !blockName) return null;

    // Ensure both parameters are strings
    const districtStr = typeof districtName === 'string' ? districtName : String(districtName);
    const blockStr = typeof blockName === 'string' ? blockName : String(blockName);

    const normalizedDistrict = districtStr.trim().toLowerCase();
    const normalizedBlock = blockStr.trim().toLowerCase();
    return BLOCK_WATER_QUALITY_DATA.find(
        item => item.district.toLowerCase() === normalizedDistrict &&
            item.block.toLowerCase() === normalizedBlock
    );
};

// Get all unique districts
export const getAllDistricts = () => {
    return [...new Set(BLOCK_WATER_QUALITY_DATA.map(item => item.district))].sort();
};

// Get all blocks for a district
export const getDistrictBlocks = (districtName) => {
    return BLOCK_WATER_QUALITY_DATA
        .filter(item => item.district === districtName)
        .map(item => item.block)
        .sort();
};

// Check if parameter exceeds safe limits
export const checkWaterQualityStatus = (data) => {
    const limits = {
        ec: 3000,        // µS/cm
        fluoride: 1.5,   // mg/l
        nitrate: 45,     // mg/l
        iron: 1.0,       // mg/l
        arsenic: 10,     // µg/l
        uranium: 30,     // µg/l
        tds: 2000,       // mg/l
        ph: { min: 6.5, max: 8.5 },
        chloride: 1000,  // mg/l
        hardness: 600    // mg/l as CaCO3
    };

    const issues = [];

    if (data.ec && data.ec > limits.ec) issues.push('High EC');
    if (data.fluoride && data.fluoride > limits.fluoride) issues.push('High Fluoride');
    if (data.nitrate && data.nitrate > limits.nitrate) issues.push('High Nitrate');
    if (data.iron && data.iron > limits.iron) issues.push('High Iron');
    if (data.arsenic && data.arsenic > limits.arsenic) issues.push('High Arsenic');
    if (data.uranium && data.uranium > limits.uranium) issues.push('High Uranium');
    if (data.tds && data.tds > limits.tds) issues.push('High TDS');
    if (data.ph && (data.ph < limits.ph.min || data.ph > limits.ph.max)) issues.push('pH out of range');
    if (data.chloride && data.chloride > limits.chloride) issues.push('High Chloride');
    if (data.hardness && data.hardness > limits.hardness) issues.push('High Hardness');

    if (issues.length === 0) {
        return { status: 'good', class: 'good', text: 'Good Quality', issues: [] };
    } else if (issues.length <= 2) {
        return { status: 'warning', class: 'warning', text: 'Moderate Quality', issues };
    } else {
        return { status: 'critical', class: 'critical', text: 'Poor Quality', issues };
    }
};

// Get parameter color based on value and safe limit
export const getParameterColor = (parameter, value) => {
    const limits = {
        ec: 3000,
        fluoride: 1.5,
        nitrate: 45,
        iron: 1.0,
        arsenic: 10,
        uranium: 30,
        tds: 2000,
        chloride: 1000,
        hardness: 600
    };

    if (!limits[parameter]) return '#4CAF50'; // Default green

    const limit = limits[parameter];
    const ratio = value / limit;

    if (ratio <= 0.5) return '#4CAF50'; // Green - Safe
    if (ratio <= 0.8) return '#8BC34A'; // Light Green - Acceptable
    if (ratio <= 1.0) return '#FFC107'; // Yellow - Warning
    if (ratio <= 1.5) return '#FF9800'; // Orange - Moderate Risk
    return '#F44336'; // Red - High Risk
};

// Calculate overall water quality index
export const calculateWQI = (data) => {
    const weights = {
        ec: 0.15,
        fluoride: 0.15,
        nitrate: 0.15,
        iron: 0.10,
        arsenic: 0.15,
        uranium: 0.10,
        tds: 0.10,
        ph: 0.05,
        chloride: 0.05
    };

    const limits = {
        ec: 3000,
        fluoride: 1.5,
        nitrate: 45,
        iron: 1.0,
        arsenic: 10,
        uranium: 30,
        tds: 2000,
        ph: 7.0,
        chloride: 1000
    };

    let wqi = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(param => {
        if (data[param] !== undefined && data[param] !== null) {
            const value = data[param];
            const limit = limits[param];

            let qi;
            if (param === 'ph') {
                // pH has optimal range
                qi = Math.abs(value - 7.0) / 1.5 * 100;
            } else {
                qi = (value / limit) * 100;
            }

            wqi += qi * weights[param];
            totalWeight += weights[param];
        }
    });

    if (totalWeight === 0) return null;

    const finalWQI = wqi / totalWeight;

    // Classify WQI
    let classification;
    if (finalWQI < 50) classification = 'Excellent';
    else if (finalWQI < 100) classification = 'Good';
    else if (finalWQI < 200) classification = 'Poor';
    else if (finalWQI < 300) classification = 'Very Poor';
    else classification = 'Unsuitable';

    return {
        value: Math.round(finalWQI),
        classification
    };
};
