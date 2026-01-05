# Quick Start Guide: Block-Level Water Quality Data

## How to View Water Quality Data

### Step 1: Select Analysis Type
1. Open the application
2. In the **Controls Sidebar** (left panel)
3. Select **"Ground Water Resource Estimation"** from the Analysis Type dropdown

### Step 2: Select District
1. In the **District** dropdown
2. Choose any district (e.g., "Jaipur", "Barmer", "Udaipur")
3. The map will update to show the selected district

### Step 3: Select Block/Taluka (Optional)
1. In the **Block** dropdown (appears after selecting district)
2. Choose a specific block/taluka (e.g., "Jaipur", "Amber", "Bassi")

### Step 4: Execute Analysis
1. Click the **"Execute Analysis"** button
2. The Data Analysis Sidebar will appear on the right

## What You'll See

### When Only District is Selected:
- Ground Water Status (Pie Chart)
- Ground Water Level (Bar Chart)
- Aquifers Present (Bar Chart)
- **Water Quality Compliance** (Bar Chart showing % stations exceeding limits)

### When District + Block is Selected:
All of the above, PLUS:
- **🆕 Block Water Quality Details Section**
  - Water Quality Index (WQI) with classification
  - Overall quality status (Good/Moderate/Poor)
  - List of issues (if any)
  - Detailed breakdown of all 10 parameters:
    - Electrical Conductivity (EC)
    - Fluoride
    - Nitrate
    - Iron
    - Arsenic
    - Uranium
    - Total Dissolved Solids (TDS)
    - pH
    - Chloride
    - Total Hardness

## Understanding the Display

### WQI (Water Quality Index)
- **< 50**: 🟢 Excellent
- **50-100**: 🟢 Good
- **100-200**: 🟡 Poor
- **200-300**: 🟠 Very Poor
- **> 300**: 🔴 Unsuitable

### Status Indicator
- **Good Quality**: ✅ All parameters within safe limits
- **Moderate Quality**: ⚠️ 1-2 parameters exceeding limits
- **Poor Quality**: ❌ 3+ parameters exceeding limits

### Parameter Colors
Each parameter has a colored dot:
- 🟢 **Green**: Safe (well within limits)
- 🟡 **Yellow**: Warning (approaching limit)
- 🟠 **Orange**: Moderate risk (exceeding limit)
- 🔴 **Red**: High risk (significantly exceeding limit)

### Parameter Status
Each parameter shows:
- **Value**: Actual measured value
- **Unit**: Measurement unit (mg/l, µS/cm, etc.)
- **Status**: "Safe" or "High"

## Example Walkthrough

### Example 1: Good Quality Block

**Selection:**
- District: Udaipur
- Block: Udaipur

**Results:**
```
WQI: 85 - Good
Status: Good Quality
All parameters within safe limits

Parameters:
✓ EC: 2350 µS/cm - Safe
✓ Fluoride: 1.5 mg/l - Safe
✓ Nitrate: 52 mg/l - High (slightly above 45 mg/l limit)
✓ Iron: 0.6 mg/l - Safe
✓ Arsenic: 4 µg/l - Safe
✓ Uranium: 20 µg/l - Safe
✓ TDS: 1580 mg/l - Safe
✓ pH: 7.5 - Normal
✓ Chloride: 390 mg/l - Safe
✓ Hardness: 450 mg/l - Safe
```

### Example 2: Poor Quality Block

**Selection:**
- District: Barmer
- Block: Barmer

**Results:**
```
WQI: 215 - Very Poor
Status: Poor Quality
Issues: High EC, High Fluoride, High Uranium

Parameters:
✗ EC: 4850 µS/cm - High
✗ Fluoride: 3.2 mg/l - High
✓ Nitrate: 52 mg/l - High
✓ Iron: 0.3 mg/l - Safe
✓ Arsenic: 8 µg/l - Safe
✗ Uranium: 42 µg/l - High
✗ TDS: 3200 mg/l - High
✓ pH: 8.4 - Normal
✗ Chloride: 980 mg/l - Safe
✗ Hardness: 820 mg/l - High
```

## Tips for Best Results

### 1. Compare Multiple Blocks
- Select different blocks within the same district
- Compare WQI values
- Identify best and worst quality blocks

### 2. Identify Problem Parameters
- Look at the "Issues" list
- Focus on parameters marked "High"
- Check color indicators (red dots = priority)

### 3. Regional Patterns
- Western Rajasthan: High fluoride, high salinity
- Eastern Rajasthan: High nitrate
- Southern Rajasthan: Generally better quality

### 4. Use for Planning
- Prioritize blocks with WQI > 200 for intervention
- Focus on parameters with red indicators
- Consider multiple parameters together

## Troubleshooting

### Block Water Quality Section Not Showing?
**Check:**
1. ✓ Analysis Type = "Ground Water Resource Estimation"
2. ✓ District is selected
3. ✓ **Block/Taluka is selected** (this is required!)
4. ✓ "Execute Analysis" button was clicked

### No Data for Selected Block?
**Possible reasons:**
1. Block name spelling doesn't match exactly
2. Data not available for that block
3. Try selecting a different block in the same district

### Values Seem Incorrect?
**Note:**
- Data is based on representative values from district atlases
- Values may vary seasonally
- Some blocks may have limited monitoring data
- For official decisions, consult latest CGWB/RSGWA reports

## Districts with Complete Data

All 33 districts have data:
- Ajmer, Alwar, Banswara, Baran, Barmer
- Bharatpur, Bhilwara, Bikaner, Bundi, Chittorgarh
- Churu, Dausa, Dhaulpur, Dungarpur, Ganganagar
- Hanumangarh, Jaipur, Jaisalmer, Jalor, Jhalawar
- Jhunjhunun, Jodhpur, Karauli, Kota, Nagaur
- Pali, Pratapgarh, Rajsamand, Sawai Madhopur, Sikar
- Sirohi, Tonk, Udaipur

## Sample Blocks to Try

### Good Quality Examples:
- Udaipur → Udaipur
- Banswara → Banswara
- Dungarpur → Dungarpur
- Pratapgarh → Pratapgarh

### Moderate Quality Examples:
- Jaipur → Amber
- Ajmer → Ajmer
- Kota → Kota

### Poor Quality Examples (High Fluoride):
- Barmer → Barmer
- Bikaner → Bikaner
- Jaisalmer → Jaisalmer
- Nagaur → Nagaur

### Poor Quality Examples (High Nitrate):
- Jaipur → Jaipur
- Sikar → Sikar
- Jhunjhunun → Jhunjhunun

## Need More Help?

**Documentation:**
- Full documentation: `docs/WATER_QUALITY_DATA.md`
- Summary report: `docs/WATER_QUALITY_INTEGRATION_SUMMARY.md`

**Data File:**
- Source code: `src/data/blockWaterQualityData.js`
- Contains all helper functions and data

**Component:**
- UI implementation: `src/components/DataAnalysisSidebar.jsx`
- Lines 214-234: Data processing
- Lines 656-836: UI rendering

---

**Ready to explore?** Start with your home district and see the water quality data!
