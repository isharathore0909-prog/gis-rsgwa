const fs = require('fs');
const path = require('path');

try {
    const logPath = path.join(__dirname, '../debug_gen.txt');
    fs.writeFileSync(logPath, "Script started\n");
    console.log("Starting generation...");
    // 1. Read Block Boundary Data
    const blockBoundaryPath = path.join(__dirname, '../public/block_boundary.json');
    console.log(`Reading from: ${blockBoundaryPath}`);

    if (!fs.existsSync(blockBoundaryPath)) {
        console.error("File not found:", blockBoundaryPath);
        process.exit(1);
    }

    const blockDataRaw = fs.readFileSync(blockBoundaryPath, 'utf8');
    const blockData = JSON.parse(blockDataRaw);
    console.log(`Loaded ${blockData.features.length} blocks.`);

    // 2. Aquifer Data
    const AQUIFER_DATA = [
        { type: "Younger Alluvium", districts: ["Ajmer", "Baran", "Barmer", "Bundi", "Churu", "Dausa", "Ganganagar", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalor", "Jhunjhunun", "Jodhpur", "Kota", "Pali", "Sikar", "Sirohi"] },
        { type: "Older Alluvium", districts: ["Alwar", "Barmer", "Bharatpur", "Bikaner", "Churu", "Dausa", "Dhaulpur", "Ganganagar", "Hanumangarh", "Jaipur", "Jalor", "Jhunjhunun", "Jodhpur", "Karauli", "Nagaur", "Pali", "Sawai Madhopur", "Sikar", "Tonk"] },
        { type: "Limestone", districts: ["Banswara", "Baran", "Bhilwara", "Bundi", "Chittorgarh", "Kota", "Pali", "Sawai Madhopur"] },
        { type: "Bilara Limestone", districts: ["Bikaner", "Churu", "Jodhpur", "Nagaur"] },
        { type: "Tertiary Sandstone", districts: ["Barmer", "Bikaner", "Jaisalmer", "Nagaur"] },
        { type: "Nagaur & Jodhpur Sandstone", districts: ["Bikaner", "Churu", "Jaisalmer", "Jodhpur", "Nagaur"] },
        { type: "Vindhyan Sandstone", districts: ["Baran", "Bhilwara", "Bundi", "Chittorgarh", "Dhaulpur", "Jhalawar", "Karauli", "Kota"] },
        { type: "Parewar Sandstone", districts: ["Jaisalmer"] },
        { type: "Gneiss", districts: ["Ajmer", "Bhilwara", "Dausa", "Jaipur", "Pali", "Tonk"] },
        { type: "Phyllite", districts: ["Banswara", "Bundi", "Dausa", "Dungarpur", "Pali", "Rajsamand", "Sawai Madhopur", "Sirohi", "Udaipur"] },
        { type: "Schist", districts: ["Ajmer", "Bhilwara", "Chittorgarh", "Churu", "Dungarpur", "Jaipur", "Jodhpur", "Nagaur", "Pratapgarh", "Rajsamand", "Sirohi", "Tonk", "Udaipur"] },
        { type: "Shale", districts: ["Baran", "Bundi", "Chittorgarh", "Jhalawar", "Kota", "Pratapgarh", "Sawai Madhopur"] },
        { type: "Ultra Basic", districts: ["Dungarpur"] },
        { type: "Rhyolite", districts: ["Barmer", "Jaisalmer", "Jalor", "Jodhpur"] },
        { type: "Basalt", districts: ["Banswara", "Baran", "Jhalawar", "Pratapgarh"] },
        { type: "Quartzite", districts: ["Alwar", "Bharatpur", "Dausa", "Jaipur", "Jhunjhunun", "Karauli", "Sawai Madhopur", "Sikar", "Udaipur"] },
        { type: "Granite Jalore", districts: ["Jodhpur"] },
        { type: "Granite", districts: ["Barmer", "Jaipur", "Jaisalmer", "Jalor", "Pali", "Sirohi", "Udaipur"] },
        { type: "BGC", districts: ["Banswara", "Chittorgarh", "Dungarpur", "Pratapgarh", "Rajsamand", "Udaipur"] },
        { type: "Hills", districts: ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bundi", "Chittorgarh", "Dausa", "Dungarpur", "Hanumangarh", "Jaipur", "Jalor", "Jhalawar", "Jhunjhunun", "Jodhpur", "Karauli", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Tonk", "Udaipur"] },
        { type: "Reserve Forest", districts: ["Chittorgarh", "Jalor"] }
    ];

    const COLORS = ['#f9c74f', '#90be6d', '#f9844a', '#4d908e', '#277da1', '#577590', '#f3722c', '#6a4c93', '#8ac926', '#1982c4'];

    // 3. Process
    const blockAquiferMap = {};

    blockData.features.forEach(feature => {
        const props = feature.properties;
        let district = props.DIST_NAME;
        let block = props.BLOCK_NAME;
        let blockArea = props.AREA_SQ_KM || 500;

        if (!district) return;
        district = district.charAt(0).toUpperCase() + district.slice(1).toLowerCase(); // Basic title case

        if (!blockAquiferMap[district]) {
            blockAquiferMap[district] = {};
        }

        const aquifersInDistrict = AQUIFER_DATA.filter(aq =>
            aq.districts.some(d => d.toLowerCase() === district.toLowerCase())
        );

        if (aquifersInDistrict.length > 0) {
            // Pseudo-random distribution based on block name
            const hash = block.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

            const blockAquifers = aquifersInDistrict.map((aq, index) => {
                const variance = (hash % (40 + index)) / 100; // unique-ish per item
                let share = 1 / aquifersInDistrict.length;
                let adjustedShare = share + (share * variance * (index % 2 === 0 ? 1 : -1));

                return {
                    type: aq.type,
                    share: Math.max(0.05, adjustedShare),
                    color: COLORS[index % COLORS.length]
                };
            });

            const totalShare = blockAquifers.reduce((sum, item) => sum + item.share, 0);

            const finalData = blockAquifers.map(item => {
                const normalizedShare = item.share / totalShare;
                const area = blockArea * normalizedShare;
                return {
                    name: item.type,
                    value: parseFloat(area.toFixed(2)),
                    percent: parseFloat((normalizedShare * 100).toFixed(1)),
                    color: item.color
                };
            }).sort((a, b) => b.value - a.value);

            blockAquiferMap[district][block] = finalData;
        } else {
            blockAquiferMap[district][block] = [];
        }
    });

    console.log("Data processed. Writing file...");

    // 4. Write
    const fileContent = `export const BLOCK_AQUIFER_DATA = ${JSON.stringify(blockAquiferMap, null, 4)};`;
    const outputPath = path.join(__dirname, '../src/data/blockAquiferData.js');

    fs.writeFileSync(outputPath, fileContent);
    console.log("File written successfully to " + outputPath);

} catch (error) {
    const logPath = path.join(__dirname, '../debug_gen.txt');
    try { fs.appendFileSync(logPath, "Error: " + error.message + "\n" + error.stack); } catch (e) { }
    console.error("Error executing script:", error);
}
