# Block-Level Water Quality Data - Rajasthan GIS Application

## Overview

This document describes the comprehensive block-level water quality data system integrated into the Rajasthan GIS application. The data provides detailed water quality parameters for blocks/talukas across all districts in Rajasthan.

## Data Source

The water quality data is based on the **Rajasthan Ground Water Atlas 2013** district-wise PDFs located in:
```
D:\GIS_RSGWA_ANALYSIS\src\data\Atlas\
```

## Data Structure

### File Location
```
D:\GIS_RSGWA_ANALYSIS\src\data\blockWaterQualityData.js
```

### Water Quality Parameters

Each block has the following water quality parameters:

| Parameter | Unit | Safe Limit | Description |
|-----------|------|------------|-------------|
| **EC** | µS/cm | < 3000 | Electrical Conductivity - indicates dissolved salt content |
| **Fluoride** | mg/l | < 1.5 | Fluoride concentration - excess causes fluorosis |
| **Nitrate** | mg/l | < 45 | Nitrate concentration - indicates agricultural pollution |
| **Iron** | mg/l | < 1.0 | Iron concentration - causes staining and taste issues |
| **Arsenic** | µg/l | < 10 | Arsenic concentration - toxic heavy metal |
| **Uranium** | µg/l | < 30 | Uranium concentration - radioactive element |
| **TDS** | mg/l | < 2000 | Total Dissolved Solids - overall water quality indicator |
| **pH** | - | 6.5-8.5 | pH value - acidity/alkalinity of water |
| **Chloride** | mg/l | < 1000 | Chloride concentration - affects taste and corrosion |
| **Hardness** | mg/l as CaCO₃ | < 600 | Total Hardness - calcium and magnesium content |

## Data Coverage

The dataset includes water quality data for:
- **33 Districts** across Rajasthan
- **150+ Blocks/Talukas**
- **10 Water Quality Parameters** per block

### Districts Covered

Ajmer, Alwar, Banswara, Baran, Barmer, Bharatpur, Bhilwara, Bikaner, Bundi, Chittorgarh, Churu, Dausa, Dhaulpur, Dungarpur, Ganganagar, Hanumangarh, Jaipur, Jaisalmer, Jalor, Jhalawar, Jhunjhunun, Jodhpur, Karauli, Kota, Nagaur, Pali, Pratapgarh, Rajsamand, Sawai Madhopur, Sikar, Sirohi, Tonk, Udaipur

## Usage

### Importing the Data

```javascript
import {
    BLOCK_WATER_QUALITY_DATA,
    getBlockWaterQuality,
    getDistrictWaterQuality,
    checkWaterQualityStatus,
    calculateWQI,
    getParameterColor
} from '../data/blockWaterQualityData';
```

### Helper Functions

#### 1. Get Water Quality for a Specific Block

```javascript
const blockData = getBlockWaterQuality('Jaipur', 'Amber');
console.log(blockData);
// Output: { district: 'Jaipur', block: 'Amber', ec: 3050, fluoride: 1.9, ... }
```

#### 2. Get All Blocks for a District

```javascript
const districtBlocks = getDistrictWaterQuality('Jaipur');
console.log(districtBlocks);
// Output: Array of all blocks in Jaipur with their water quality data
```

#### 3. Check Water Quality Status

```javascript
const blockData = getBlockWaterQuality('Barmer', 'Barmer');
const status = checkWaterQualityStatus(blockData);
console.log(status);
// Output: {
//   status: 'critical',
//   class: 'critical',
//   text: 'Poor Quality',
//   issues: ['High EC', 'High Fluoride', 'High Uranium']
// }
```

#### 4. Calculate Water Quality Index (WQI)

```javascript
const blockData = getBlockWaterQuality('Udaipur', 'Udaipur');
const wqi = calculateWQI(blockData);
console.log(wqi);
// Output: { value: 85, classification: 'Good' }
```

**WQI Classification:**
- **< 50**: Excellent
- **50-100**: Good
- **100-200**: Poor
- **200-300**: Very Poor
- **> 300**: Unsuitable for drinking

#### 5. Get Parameter Color

```javascript
const color = getParameterColor('fluoride', 2.5);
console.log(color);
// Output: '#F44336' (Red - indicating high risk)
```

**Color Coding:**
- **Green (#4CAF50)**: Safe (≤ 50% of limit)
- **Light Green (#8BC34A)**: Acceptable (50-80% of limit)
- **Yellow (#FFC107)**: Warning (80-100% of limit)
- **Orange (#FF9800)**: Moderate Risk (100-150% of limit)
- **Red (#F44336)**: High Risk (> 150% of limit)

## UI Integration

### DataAnalysisSidebar Component

The water quality data is automatically displayed in the `DataAnalysisSidebar` component when:

1. **Analysis Type**: "Ground Water Resource Estimation" is selected
2. **District**: A district is selected from the dropdown
3. **Block/Taluka**: A specific block is selected (optional)

### Display Features

#### When Only District is Selected:
- Shows district-level water quality compliance chart
- Displays percentage of monitoring stations exceeding safe limits

#### When District + Block is Selected:
- Shows detailed block-level water quality parameters
- Displays Water Quality Index (WQI) with classification
- Shows quality status (Good/Moderate/Poor) with issues
- Lists all 10 water quality parameters with:
  - Actual values
  - Units
  - Color-coded indicators
  - Safe/High status labels

## Example Data Entry

```javascript
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
}
```

## Water Quality Interpretation

### Critical Parameters for Rajasthan

1. **High Fluoride Areas**: Western Rajasthan (Barmer, Bikaner, Jaisalmer, Nagaur)
   - Causes dental and skeletal fluorosis
   - Requires defluoridation treatment

2. **High Nitrate Areas**: Eastern Rajasthan (Jaipur, Sikar, Jhunjhunun, Alwar)
   - Indicates agricultural pollution
   - Causes methemoglobinemia (blue baby syndrome)

3. **High Salinity (EC/TDS)**: Western and Northwestern Rajasthan
   - Makes water unsuitable for drinking and irrigation
   - Requires desalination or alternative sources

4. **High Uranium**: Specific pockets in Nagaur, Bikaner, and Ganganagar
   - Radioactive contamination
   - Requires specialized treatment

## Updating the Data

### Manual Updates

To update the water quality data:

1. Edit `D:\GIS_RSGWA_ANALYSIS\src\data\blockWaterQualityData.js`
2. Add or modify block entries in the `BLOCK_WATER_QUALITY_DATA` array
3. Follow the existing data structure

### Automated Extraction (Future Enhancement)

A Python script is available for automated PDF data extraction:
```
D:\GIS_RSGWA_ANALYSIS\scripts\extract_water_quality.py
```

**Requirements:**
- Python 3.x
- PyPDF2 library
- PDF files in the Atlas directory

**Usage:**
```bash
cd D:\GIS_RSGWA_ANALYSIS
python scripts\extract_water_quality.py
```

## Data Quality and Limitations

### Current Status
- Data is based on representative values from district atlases
- Values are indicative and may vary seasonally
- Some blocks may have limited monitoring data

### Recommendations
1. Regular updates from official CGWB/RSGWA reports
2. Integration with real-time monitoring data
3. Seasonal variation analysis
4. Trend analysis over multiple years

## Technical Implementation

### Performance Optimization
- Data is stored as a static JavaScript array for fast access
- Helper functions use efficient filtering and searching
- useMemo hooks prevent unnecessary recalculations
- Conditional rendering reduces DOM updates

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Edge, Safari)
- No external dependencies for data access
- Lightweight data structure (< 100KB)

## Future Enhancements

1. **Time-Series Data**: Add historical water quality trends
2. **Spatial Interpolation**: Estimate values for areas without monitoring
3. **Predictive Analytics**: ML models for water quality forecasting
4. **Mobile App Integration**: Offline access to water quality data
5. **Public API**: RESTful API for third-party applications
6. **Real-time Updates**: Integration with IoT sensors and monitoring stations

## References

1. Rajasthan Ground Water Atlas 2013 - Central Ground Water Board
2. Ground Water Quality in Shallow Aquifers of India - CGWB
3. IS 10500:2012 - Indian Standard for Drinking Water Specifications
4. WHO Guidelines for Drinking Water Quality

## Support

For questions or issues related to water quality data:
- Check the data structure in `blockWaterQualityData.js`
- Review helper function implementations
- Consult the DataAnalysisSidebar component integration

## License

This data is compiled from publicly available government reports and is intended for educational and research purposes.

---

**Last Updated**: January 2026  
**Data Version**: 1.0  
**Coverage**: 33 Districts, 150+ Blocks
