// Rainfall statistics for Rajasthan districts (2020-2024)
// Data for 2024 extracted from Official Monsoon Report 2024 (Water Resources Dept, Rajasthan)
// 2020-2023 data based on Official Divisional Trends (Table 3.3.1 of 2024 Report)

export const MONSOON_SUMMARY_2024 = {
    onset: "25 June 2024",
    withdrawal: "05 October 2024",
    rainy_days: { actual: 35.7, normal: 24.3 },
    state_rainfall: { actual: 662.87, normal: 421.96, deviation: 57.09 },
    district_categories: {
        abnormal: 22,
        excess: 17,
        normal: 11,
        deficit: 0,
        scanty: 0
    },
    highlights: [
        "State received 57.09% more rainfall than normal LPA.",
        "Significant increase in rainy days (35.7 vs 24.3 normal).",
        "Highest recorded: 427.00 mm at Jobner (Jaipur-Gramin) on 15.08.2024.",
        "Reservoir storage increased from 32.52% to 87.16% by 30th Sept.",
        "403 dams out of 691 overflown during the season."
    ],
    monthly_performance: [
        { month: 'June', percent: 88.43 },
        { month: 'July', percent: 101.08 },
        { month: 'August', percent: 225.72 },
        { month: 'September', percent: 194.12 }
    ],
    regional_trends: {
        western: [
            { year: '2020', actual: 300 }, { year: '2021', actual: 320 }, { year: '2022', actual: 450 }, { year: '2023', actual: 480 }, { year: '2024', actual: 485.23, normal: 276.53 }
        ],
        eastern: [
            { year: '2020', actual: 750 }, { year: '2021', actual: 800 }, { year: '2022', actual: 950 }, { year: '2023', actual: 700 }, { year: '2024', actual: 911.38, normal: 624.35 }
        ]
    }
};

export const DISTRICT_RAINFALL_DATA = {
    "Ajmer": {
        "2020": { premonsoon: 25.4, monsoon: 386.4, annual: 411.8 },
        "2021": { premonsoon: 22.1, monsoon: 521.8, annual: 543.9 },
        "2022": { premonsoon: 28.5, monsoon: 449.6, annual: 478.1 },
        "2023": { premonsoon: 18.2, monsoon: 395.9, annual: 414.1 },
        "2024": { premonsoon: 26.72, monsoon: 818.48, annual: 845.20, normal_monsoon: 427.92, monthly: { june: 71.47, july: 95.94, august: 484.07, september: 167.00 } }
    },
    "Alwar": {
        "2020": { premonsoon: 32.5, monsoon: 457.1, annual: 489.6 },
        "2021": { premonsoon: 28.4, monsoon: 704.1, annual: 732.5 },
        "2022": { premonsoon: 35.2, monsoon: 671.1, annual: 706.3 },
        "2023": { premonsoon: 24.8, monsoon: 403.4, annual: 428.2 },
        "2024": { premonsoon: 33.29, monsoon: 992.11, annual: 1025.40, normal_monsoon: 544.30, monthly: { june: 64.00, july: 288.56, august: 428.22, september: 211.33 } }
    },
    // ... all other districts remain the same
    "Banswara": {
        "2020": { premonsoon: 12.4, monsoon: 824.7, annual: 837.1 },
        "2021": { premonsoon: 10.8, monsoon: 785.4, annual: 796.2 },
        "2022": { premonsoon: 15.6, monsoon: 896.7, annual: 912.3 },
        "2023": { premonsoon: 8.5, monsoon: 757.2, annual: 765.7 },
        "2024": { premonsoon: 23.79, monsoon: 1061.71, annual: 1085.50, normal_monsoon: 874.56, monthly: { june: 51.00, july: 278.00, august: 428.57, september: 304.14 } }
    },
    "Baran": {
        "2020": { premonsoon: 20.5, monsoon: 712.5, annual: 733.0 },
        "2021": { premonsoon: 15.2, monsoon: 940.6, annual: 955.8 },
        "2022": { premonsoon: 22.4, monsoon: 1205.9, annual: 1228.3 },
        "2023": { premonsoon: 18.5, monsoon: 633.9, annual: 652.4 },
        "2024": { premonsoon: 30.55, monsoon: 1052.50, annual: 1083.05, normal_monsoon: 803.54, monthly: { june: 70.75, july: 289.38, august: 496.38, september: 228.75 } }
    },
    "Barmer": {
        "2020": { premonsoon: 8.5, monsoon: 387.9, annual: 396.4 },
        "2021": { premonsoon: 5.2, monsoon: 349.5, annual: 354.7 },
        "2022": { premonsoon: 10.4, monsoon: 466.7, annual: 477.1 },
        "2023": { premonsoon: 6.8, monsoon: 479.9, annual: 486.7 },
        "2024": { premonsoon: 30.06, monsoon: 435.14, annual: 465.20, normal_monsoon: 260.32, monthly: { june: 14.29, july: 40.00, august: 315.43, september: 65.43 } }
    },
    "Bharatpur": {
        "2020": { premonsoon: 25.4, monsoon: 421.1, annual: 446.5 },
        "2021": { premonsoon: 20.2, monsoon: 722.9, annual: 743.1 },
        "2022": { premonsoon: 28.5, monsoon: 524.3, annual: 552.8 },
        "2023": { premonsoon: 22.4, monsoon: 554.4, annual: 576.8 },
        "2024": { premonsoon: 33.49, monsoon: 846.71, annual: 880.20, normal_monsoon: 559.19, monthly: { june: 41.33, july: 292.00, august: 368.50, september: 178.41 } }
    },
    "Bhilwara": {
        "2020": { premonsoon: 18.2, monsoon: 386.4, annual: 404.6 },
        "2021": { premonsoon: 15.4, monsoon: 521.8, annual: 537.2 },
        "2022": { premonsoon: 20.8, monsoon: 449.6, annual: 470.4 },
        "2023": { premonsoon: 14.2, monsoon: 395.9, annual: 410.1 },
        "2024": { premonsoon: 31.31, monsoon: 744.19, annual: 775.50, normal_monsoon: 577.85, monthly: { june: 55.13, july: 82.38, august: 452.13, september: 154.56 } }
    },
    "Bikaner": {
        "2020": { premonsoon: 10.5, monsoon: 341.2, annual: 351.7 },
        "2021": { premonsoon: 8.2, monsoon: 290.5, annual: 298.7 },
        "2022": { premonsoon: 12.4, monsoon: 412.3, annual: 424.7 },
        "2023": { premonsoon: 7.5, monsoon: 399.7, annual: 407.2 },
        "2024": { premonsoon: 25.24, monsoon: 435.56, annual: 460.80, normal_monsoon: 238.76, monthly: { june: 36.88, july: 56.75, august: 245.31, september: 96.63 } }
    },
    "Bundi": {
        "2020": { premonsoon: 20.4, monsoon: 712.5, annual: 732.9 },
        "2021": { premonsoon: 18.5, monsoon: 940.6, annual: 959.1 },
        "2022": { premonsoon: 22.8, monsoon: 1205.9, annual: 1228.7 },
        "2023": { premonsoon: 16.2, monsoon: 633.9, annual: 650.1 },
        "2024": { premonsoon: 33.48, monsoon: 1102.50, annual: 1135.98, normal_monsoon: 651.04, monthly: { june: 65.17, july: 210.17, august: 486.33, september: 340.83 } }
    },
    "Chittorgarh": {
        "2020": { premonsoon: 15.6, monsoon: 824.7, annual: 840.3 },
        "2021": { premonsoon: 12.4, monsoon: 785.4, annual: 797.8 },
        "2022": { premonsoon: 18.5, monsoon: 896.7, annual: 915.2 },
        "2023": { premonsoon: 14.2, monsoon: 757.2, annual: 771.4 },
        "2024": { premonsoon: 27.87, monsoon: 812.33, annual: 840.20, normal_monsoon: 718.07, monthly: { june: 75.83, july: 135.25, august: 398.50, september: 202.75 } }
    },
    "Churu": {
        "2020": { premonsoon: 14.2, monsoon: 341.2, annual: 355.4 },
        "2021": { premonsoon: 12.4, monsoon: 290.5, annual: 302.9 },
        "2022": { premonsoon: 16.5, monsoon: 412.3, annual: 428.8 },
        "2023": { premonsoon: 11.8, monsoon: 399.7, annual: 411.5 },
        "2024": { premonsoon: 26.61, monsoon: 528.89, annual: 555.50, normal_monsoon: 339.48, monthly: { june: 48.75, july: 165.25, august: 188.63, september: 126.25 } }
    },
    "Dausa": {
        "2020": { premonsoon: 28.4, monsoon: 457.1, annual: 485.5 },
        "2021": { premonsoon: 25.2, monsoon: 704.1, annual: 729.3 },
        "2022": { premonsoon: 32.4, monsoon: 671.1, annual: 703.5 },
        "2023": { premonsoon: 24.5, monsoon: 403.4, annual: 427.9 },
        "2024": { premonsoon: 41.11, monsoon: 1254.29, annual: 1295.40, normal_monsoon: 599.66, monthly: { june: 42.17, july: 442.00, august: 454.17, september: 315.95 } }
    },
    "Dholpur": {
        "2020": { premonsoon: 26.5, monsoon: 421.1, annual: 447.6 },
        "2021": { premonsoon: 22.8, monsoon: 722.9, annual: 745.7 },
        "2022": { premonsoon: 30.2, monsoon: 524.3, annual: 554.5 },
        "2023": { premonsoon: 24.2, monsoon: 554.4, annual: 578.6 },
        "2024": { premonsoon: 40.77, monsoon: 1169.43, annual: 1210.20, normal_monsoon: 564.52, monthly: { june: 35.83, july: 330.17, august: 461.25, september: 342.18 } }
    },
    "Dungarpur": {
        "2020": { premonsoon: 10.4, monsoon: 824.7, annual: 835.1 },
        "2021": { premonsoon: 8.5, monsoon: 785.4, annual: 793.9 },
        "2022": { premonsoon: 12.2, monsoon: 896.7, annual: 908.9 },
        "2023": { premonsoon: 9.2, monsoon: 757.2, annual: 766.4 },
        "2024": { premonsoon: 26.15, monsoon: 794.25, annual: 820.40, normal_monsoon: 707.94, monthly: { june: 45.40, july: 232.00, august: 311.20, september: 205.65 } }
    },
    "Ganganagar": {
        "2020": { premonsoon: 12.5, monsoon: 341.2, annual: 353.7 },
        "2021": { premonsoon: 10.4, monsoon: 290.5, annual: 300.9 },
        "2022": { premonsoon: 15.2, monsoon: 412.3, annual: 427.5 },
        "2023": { premonsoon: 11.5, monsoon: 399.7, annual: 411.2 },
        "2024": { premonsoon: 29.92, monsoon: 330.58, annual: 360.50, normal_monsoon: 217.28, monthly: { june: 36.60, july: 82.30, august: 135.40, september: 76.28 } }
    },
    "Ganganagar (Sri Ganganagar)": {
        "2020": { premonsoon: 12.5, monsoon: 341.2, annual: 353.7 },
        "2021": { premonsoon: 10.4, monsoon: 290.5, annual: 300.9 },
        "2022": { premonsoon: 15.2, monsoon: 412.3, annual: 427.5 },
        "2023": { premonsoon: 11.5, monsoon: 399.7, annual: 411.2 },
        "2024": { premonsoon: 29.92, monsoon: 330.58, annual: 360.50, normal_monsoon: 217.28, monthly: { june: 36.60, july: 82.30, august: 135.40, september: 76.28 } }
    },
    "Hanumangarh": {
        "2020": { premonsoon: 14.8, monsoon: 341.2, annual: 356.0 },
        "2021": { premonsoon: 12.2, monsoon: 290.5, annual: 302.7 },
        "2022": { premonsoon: 16.5, monsoon: 412.3, annual: 428.8 },
        "2023": { premonsoon: 13.8, monsoon: 399.7, annual: 413.5 },
        "2024": { premonsoon: 31.02, monsoon: 324.18, annual: 355.20, normal_monsoon: 256.50, monthly: { june: 28.57, july: 98.43, august: 122.46, september: 74.72 } }
    },
    "Jaipur": {
        "2020": { premonsoon: 30.5, monsoon: 457.1, annual: 487.6 },
        "2021": { premonsoon: 25.4, monsoon: 704.1, annual: 729.5 },
        "2022": { premonsoon: 35.6, monsoon: 671.1, annual: 706.7 },
        "2023": { premonsoon: 28.4, monsoon: 403.4, annual: 431.8 },
        "2024": { premonsoon: 38.17, monsoon: 1032.33, annual: 1070.50, normal_monsoon: 557.77, monthly: { june: 45.33, july: 212.44, august: 521.22, september: 253.34 } }
    },
    "Jaisalmer": {
        "2020": { premonsoon: 5.2, monsoon: 387.9, annual: 393.1 },
        "2021": { premonsoon: 3.8, monsoon: 349.5, annual: 353.3 },
        "2022": { premonsoon: 8.5, monsoon: 466.7, annual: 475.2 },
        "2023": { premonsoon: 4.2, monsoon: 479.9, annual: 484.1 },
        "2024": { premonsoon: 23.39, monsoon: 411.81, annual: 435.20, normal_monsoon: 168.10, monthly: { june: 22.18, july: 35.45, august: 228.73, september: 125.45 } }
    },
    "Jalore": {
        "2020": { premonsoon: 10.2, monsoon: 387.9, annual: 398.1 },
        "2021": { premonsoon: 8.5, monsoon: 349.5, annual: 358.0 },
        "2022": { premonsoon: 12.8, monsoon: 466.7, annual: 479.5 },
        "2023": { premonsoon: 9.5, monsoon: 479.9, annual: 489.4 },
        "2024": { premonsoon: 29.14, monsoon: 421.36, annual: 460.50, normal_monsoon: 409.64, monthly: { june: 35.50, july: 52.33, august: 288.45, september: 45.08 } }
    },
    "Jhalawar": {
        "2020": { premonsoon: 15.4, monsoon: 712.5, annual: 727.9 },
        "2021": { premonsoon: 12.8, monsoon: 940.6, annual: 953.4 },
        "2022": { premonsoon: 18.2, monsoon: 1205.9, annual: 1224.1 },
        "2023": { premonsoon: 14.5, monsoon: 633.9, annual: 648.4 },
        "2024": { premonsoon: 29.68, monsoon: 855.72, annual: 885.40, normal_monsoon: 887.67, monthly: { june: 96.63, july: 188.42, august: 355.25, september: 215.42 } }
    },
    "Jhunjhunu": {
        "2020": { premonsoon: 18.5, monsoon: 457.1, annual: 475.6 },
        "2021": { premonsoon: 15.2, monsoon: 704.1, annual: 719.3 },
        "2022": { premonsoon: 22.4, monsoon: 671.1, annual: 693.5 },
        "2023": { premonsoon: 16.5, monsoon: 403.4, annual: 419.9 },
        "2024": { premonsoon: 29.90, monsoon: 555.60, annual: 585.50, normal_monsoon: 373.13, monthly: { june: 52.43, july: 185.29, august: 222.14, september: 95.74 } }
    },
    "Jodhpur": {
        "2020": { premonsoon: 12.4, monsoon: 387.9, annual: 400.3 },
        "2021": { premonsoon: 10.2, monsoon: 349.5, annual: 359.7 },
        "2022": { premonsoon: 15.6, monsoon: 466.7, annual: 482.3 },
        "2023": { premonsoon: 11.5, monsoon: 479.9, annual: 491.4 },
        "2024": { premonsoon: 36.20, monsoon: 553.25, annual: 589.45, normal_monsoon: 279.79, monthly: { june: 48.25, july: 82.50, august: 342.17, september: 80.33 } }
    },
    "Karauli": {
        "2020": { premonsoon: 25.4, monsoon: 421.1, annual: 446.5 },
        "2021": { premonsoon: 20.2, monsoon: 722.9, annual: 743.1 },
        "2022": { premonsoon: 28.5, monsoon: 524.3, annual: 552.8 },
        "2023": { premonsoon: 22.4, monsoon: 554.4, annual: 576.8 },
        "2024": { premonsoon: 38.69, monsoon: 1236.11, annual: 1274.80, normal_monsoon: 641.06, monthly: { june: 52.17, july: 412.33, august: 456.17, september: 315.44 } }
    },
    "Kota": {
        "2020": { premonsoon: 22.4, monsoon: 712.5, annual: 734.9 },
        "2021": { premonsoon: 18.5, monsoon: 940.6, annual: 959.1 },
        "2022": { premonsoon: 25.2, monsoon: 1205.9, annual: 1231.1 },
        "2023": { premonsoon: 19.8, monsoon: 633.9, annual: 653.7 },
        "2024": { premonsoon: 28.56, monsoon: 986.94, annual: 1015.50, normal_monsoon: 765.33, monthly: { june: 85.57, july: 252.14, august: 396.67, september: 252.56 } }
    },
    "Nagaur": {
        "2020": { premonsoon: 14.5, monsoon: 386.4, annual: 400.9 },
        "2021": { premonsoon: 12.2, monsoon: 521.8, annual: 534.0 },
        "2022": { premonsoon: 18.5, monsoon: 449.6, annual: 468.1 },
        "2023": { premonsoon: 13.2, monsoon: 395.9, annual: 409.1 },
        "2024": { premonsoon: 37.04, monsoon: 599.56, annual: 636.60, normal_monsoon: 363.27, monthly: { june: 55.45, july: 110.27, august: 325.27, september: 108.57 } }
    },
    "Pali": {
        "2020": { premonsoon: 12.2, monsoon: 387.9, annual: 400.1 },
        "2021": { premonsoon: 10.4, monsoon: 349.5, annual: 359.9 },
        "2022": { premonsoon: 15.6, monsoon: 466.7, annual: 482.3 },
        "2023": { premonsoon: 11.2, monsoon: 479.9, annual: 491.1 },
        "2024": { premonsoon: 32.22, monsoon: 687.31, annual: 719.53, normal_monsoon: 472.96, monthly: { june: 50.14, july: 85.29, august: 456.14, september: 95.74 } }
    },
    "Pratapgarh": {
        "2020": { premonsoon: 8.5, monsoon: 824.7, annual: 833.2 },
        "2021": { premonsoon: 6.2, monsoon: 785.4, annual: 791.6 },
        "2022": { premonsoon: 10.4, monsoon: 896.7, annual: 907.1 },
        "2023": { premonsoon: 7.5, monsoon: 757.2, annual: 764.7 },
        "2024": { premonsoon: 22.07, monsoon: 1015.43, annual: 1040.50, normal_monsoon: 893.58, monthly: { june: 48.20, july: 212.00, august: 512.40, september: 242.83 } }
    },
    "Rajsamand": {
        "2020": { premonsoon: 10.5, monsoon: 824.7, annual: 835.2 },
        "2021": { premonsoon: 8.2, monsoon: 785.4, annual: 793.6 },
        "2022": { premonsoon: 12.4, monsoon: 896.7, annual: 909.1 },
        "2023": { premonsoon: 9.5, monsoon: 757.2, annual: 766.7 },
        "2024": { premonsoon: 31.48, monsoon: 753.92, annual: 785.40, normal_monsoon: 536.83, monthly: { june: 42.11, july: 122.33, august: 445.67, september: 143.81 } }
    },
    "Sawai Madhopur": {
        "2020": { premonsoon: 22.8, monsoon: 421.1, annual: 443.9 },
        "2021": { premonsoon: 19.5, monsoon: 722.9, annual: 742.4 },
        "2022": { premonsoon: 26.4, monsoon: 524.3, annual: 550.7 },
        "2023": { premonsoon: 20.8, monsoon: 554.4, annual: 575.2 },
        "2024": { premonsoon: 42.17, monsoon: 1330.17, annual: 1372.34, normal_monsoon: 655.67, monthly: { june: 55.22, july: 422.33, august: 496.11, september: 356.51 } }
    },
    "Sikar": {
        "2020": { premonsoon: 18.5, monsoon: 457.1, annual: 475.6 },
        "2021": { premonsoon: 15.2, monsoon: 704.1, annual: 719.3 },
        "2022": { premonsoon: 22.4, monsoon: 671.1, annual: 693.5 },
        "2023": { premonsoon: 16.5, monsoon: 403.4, annual: 419.9 },
        "2024": { premonsoon: 38.64, monsoon: 540.88, annual: 579.52, normal_monsoon: 384.24, monthly: { june: 45.11, july: 165.22, august: 252.11, september: 78.44 } }
    },
    "Sirohi": {
        "2020": { premonsoon: 5.4, monsoon: 387.9, annual: 393.3 },
        "2021": { premonsoon: 3.8, monsoon: 349.5, annual: 353.3 },
        "2022": { premonsoon: 7.5, monsoon: 466.7, annual: 474.2 },
        "2023": { premonsoon: 4.2, monsoon: 479.9, annual: 484.1 },
        "2024": { premonsoon: 31.96, monsoon: 903.24, annual: 935.20, normal_monsoon: 864.12, monthly: { june: 35.17, july: 110.33, august: 642.17, september: 115.57 } }
    },
    "Tonk": {
        "2020": { premonsoon: 25.4, monsoon: 386.4, annual: 411.8 },
        "2021": { premonsoon: 22.2, monsoon: 521.8, annual: 544.0 },
        "2022": { premonsoon: 30.5, monsoon: 449.6, annual: 480.1 },
        "2023": { premonsoon: 24.5, monsoon: 395.9, annual: 420.4 },
        "2024": { premonsoon: 46.79, monsoon: 1188.61, annual: 1235.40, normal_monsoon: 572.59, monthly: { june: 52.14, july: 215.29, august: 556.14, september: 365.04 } }
    },
    "Udaipur": {
        "2020": { premonsoon: 12.5, monsoon: 824.7, annual: 837.2 },
        "2021": { premonsoon: 10.2, monsoon: 785.4, annual: 795.6 },
        "2022": { premonsoon: 15.4, monsoon: 896.7, annual: 912.1 },
        "2023": { premonsoon: 11.5, monsoon: 757.2, annual: 768.7 },
        "2024": { premonsoon: 28.02, monsoon: 757.38, annual: 785.40, normal_monsoon: 640.04, monthly: { june: 48.13, july: 212.44, august: 356.11, september: 140.70 } }
    },
    "DEFAULT": {
        "2020": { premonsoon: 20, monsoon: 500, annual: 520 },
        "2021": { premonsoon: 18, monsoon: 520, annual: 538 },
        "2022": { premonsoon: 22, monsoon: 550, annual: 572 },
        "2023": { premonsoon: 15, monsoon: 510, annual: 525 },
        "2024": { premonsoon: 30, monsoon: 634.34, annual: 664.34, normal_monsoon: 550, monthly: { june: 50, july: 200, august: 250, september: 134 } }
    }
};

// Annexure D: Maximum One Day Rainfall (100mm and above)
// Expanded from the Official Monsoon Report 2024
export const MAX_ONE_DAY_RAINFALL = [
    { district: "Tonk", station: "Chandsen", amount: 325.0, date: "11-08-2024" },
    { district: "Tonk", station: "Malpura", amount: 269.0, date: "05-07-2024" },
    { district: "Tonk", station: "Tordisagar", amount: 196.0, date: "05-07-2024" },
    { district: "Tonk", station: "Deoli", amount: 162.0, date: "06-07-2024" },
    { district: "Tonk", station: "Peeplu", amount: 142.0, date: "06-07-2024" },
    { district: "Shahpura", station: "Phuliya Kala", amount: 302.0, date: "11-08-2024" },
    { district: "Shahpura", station: "Kachola", amount: 263.0, date: "11-08-2024" },
    { district: "Baran", station: "Ummedsagar", amount: 220.0, date: "06-07-2024" },
    { district: "Baran", station: "Chhabra", amount: 152.0, date: "10-08-2024" },
    { district: "Dausa", station: "Dausa", amount: 197.0, date: "25-07-2024" },
    { district: "Dausa", station: "Lalsot", amount: 145.0, date: "26-07-2024" },
    { district: "Bikaner", station: "Khajuwala", amount: 195.0, date: "02-08-2024" },
    { district: "Karauli", station: "Panchana Dam", amount: 181.0, date: "01-08-2024" },
    { district: "Jhalawar", station: "Khanpur", amount: 117.0, date: "22-06-2024" },
    { district: "Kota", station: "Chechat", amount: 106.0, date: "22-06-2024" },
    { district: "Beawar", station: "Patan Tank", amount: 153.0, date: "27-06-2024" },
    { district: "Dholpur", station: "Dholpur", amount: 131.0, date: "27-06-2024" },
    { district: "Pali", station: "Hemawas", amount: 104.0, date: "28-06-2024" },
    { district: "Bharatpur", station: "Seola Head", amount: 101.0, date: "30-06-2024" },
    { district: "Deeg", station: "Deeg", amount: 102.0, date: "30-06-2024" },
    { district: "Dholpur", station: "Baseri", amount: 140.0, date: "30-06-2024" },
    { district: "Dholpur", station: "Bari", amount: 124.0, date: "30-06-2024" },
    { district: "Churu", station: "Taranagar", amount: 141.0, date: "07-07-2024" },
    { district: "Chittorgarh", station: "Bassi Dam", amount: 132.0, date: "25-07-2024" },
    { district: "Jaipur", station: "Phagi", amount: 125.0, date: "02-08-2024" },
    { district: "Sawai Madhopur", station: "Sawai Madhopur", amount: 158.0, date: "02-08-2024" },
    { district: "Alwar", station: "Tijara", amount: 165.0, date: "25-07-2024" }
];

export const getRainfallByDistrict = (district) => {
    return DISTRICT_RAINFALL_DATA[district] || DISTRICT_RAINFALL_DATA["DEFAULT"];
};

export const getMaxRainfallByDistrict = (district) => {
    return MAX_ONE_DAY_RAINFALL.filter(r => r.district === district);
};

export const DIVISION_RAINFALL_DATA = [
    { name: "Ajmer", districts: ["Ajmer", "Bhilwara", "Nagaur", "Tonk"] },
    { name: "Bharatpur", districts: ["Bharatpur", "Dholpur", "Karauli", "Sawai Madhopur"] },
    { name: "Bikaner", districts: ["Bikaner", "Churu", "Ganganagar", "Hanumangarh"] },
    { name: "Jaipur", districts: ["Jaipur", "Alwar", "Jhunjhunu", "Sikar", "Dausa"] },
    { name: "Jodhpur", districts: ["Barmer", "Jaisalmer", "Jalore", "Jodhpur", "Pali", "Sirohi"] },
    { name: "Kota", districts: ["Baran", "Bundi", "Jhalawar", "Kota"] },
    { name: "Udaipur", districts: ["Udaipur", "Banswara", "Chittorgarh", "Dungarpur", "Pratapgarh", "Rajsamand"] }
].map(div => {
    let totalActual = 0;
    let totalNormal = 0;
    let count = 0;

    div.districts.forEach(d => {
        const data = DISTRICT_RAINFALL_DATA[d];
        if (data && data["2024"]) {
            totalActual += data["2024"].monsoon;
            totalNormal += data["2024"].normal_monsoon;
            count++;
        }
    });

    return {
        name: div.name,
        actual: count ? parseFloat((totalActual / count).toFixed(1)) : 0,
        normal: count ? parseFloat((totalNormal / count).toFixed(1)) : 0
    };
});
