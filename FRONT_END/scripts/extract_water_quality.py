"""
Extract water quality data from Rajasthan District-wise Atlas PDFs
This script extracts block-level water quality parameters from PDF files
"""

import PyPDF2
import re
import json
import os
from pathlib import Path

# Define the Atlas directory path
ATLAS_DIR = Path(r"D:\GIS_RSGWA_ANALYSIS\src\data\Atlas")
OUTPUT_FILE = Path(r"D:\GIS_RSGWA_ANALYSIS\src\data\blockWaterQualityData.js")

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""

def extract_district_name(filename):
    """Extract district name from filename"""
    # Format: "Districtwise Atlas - DistrictName.pdf"
    match = re.search(r'Districtwise Atlas - (.+)\.pdf', filename)
    if match:
        return match.group(1).strip()
    return None

def parse_water_quality_data(text, district_name):
    """
    Parse water quality data from PDF text
    Looking for patterns like:
    - EC (Electrical Conductivity)
    - Fluoride
    - Nitrate
    - Iron
    - Arsenic
    - Uranium
    - TDS (Total Dissolved Solids)
    - pH
    - Chloride
    """
    
    blocks_data = {}
    
    # Common patterns to look for block names in Rajasthan
    # Block names are usually in format: "Block: NAME" or "Tehsil: NAME"
    block_pattern = r'(?:Block|Tehsil|Taluka)[\s:]+([A-Z][a-zA-Z\s]+)'
    
    # Water quality parameter patterns
    # Looking for patterns like "EC: 2500 µS/cm" or "Fluoride: 1.5 mg/l"
    ec_pattern = r'(?:EC|Electrical Conductivity)[\s:]+(\d+\.?\d*)'
    fluoride_pattern = r'Fluoride[\s:]+(\d+\.?\d*)'
    nitrate_pattern = r'Nitrate[\s:]+(\d+\.?\d*)'
    iron_pattern = r'Iron[\s:]+(\d+\.?\d*)'
    arsenic_pattern = r'Arsenic[\s:]+(\d+\.?\d*)'
    uranium_pattern = r'Uranium[\s:]+(\d+\.?\d*)'
    tds_pattern = r'TDS[\s:]+(\d+\.?\d*)'
    ph_pattern = r'pH[\s:]+(\d+\.?\d*)'
    chloride_pattern = r'Chloride[\s:]+(\d+\.?\d*)'
    
    # Split text into sections (rough approach)
    lines = text.split('\n')
    
    current_block = None
    
    for i, line in enumerate(lines):
        # Check for block name
        block_match = re.search(block_pattern, line)
        if block_match:
            current_block = block_match.group(1).strip()
            if current_block not in blocks_data:
                blocks_data[current_block] = {
                    'district': district_name,
                    'block': current_block
                }
        
        # If we have a current block, look for water quality parameters
        if current_block:
            # Check next few lines for parameters
            context = ' '.join(lines[i:min(i+10, len(lines))])
            
            ec_match = re.search(ec_pattern, context)
            if ec_match and 'ec' not in blocks_data[current_block]:
                blocks_data[current_block]['ec'] = float(ec_match.group(1))
            
            fluoride_match = re.search(fluoride_pattern, context)
            if fluoride_match and 'fluoride' not in blocks_data[current_block]:
                blocks_data[current_block]['fluoride'] = float(fluoride_match.group(1))
            
            nitrate_match = re.search(nitrate_pattern, context)
            if nitrate_match and 'nitrate' not in blocks_data[current_block]:
                blocks_data[current_block]['nitrate'] = float(nitrate_match.group(1))
            
            iron_match = re.search(iron_pattern, context)
            if iron_match and 'iron' not in blocks_data[current_block]:
                blocks_data[current_block]['iron'] = float(iron_match.group(1))
            
            arsenic_match = re.search(arsenic_pattern, context)
            if arsenic_match and 'arsenic' not in blocks_data[current_block]:
                blocks_data[current_block]['arsenic'] = float(arsenic_match.group(1))
            
            uranium_match = re.search(uranium_pattern, context)
            if uranium_match and 'uranium' not in blocks_data[current_block]:
                blocks_data[current_block]['uranium'] = float(uranium_match.group(1))
            
            tds_match = re.search(tds_pattern, context)
            if tds_match and 'tds' not in blocks_data[current_block]:
                blocks_data[current_block]['tds'] = float(tds_match.group(1))
            
            ph_match = re.search(ph_pattern, context)
            if ph_match and 'ph' not in blocks_data[current_block]:
                blocks_data[current_block]['ph'] = float(ph_match.group(1))
            
            chloride_match = re.search(chloride_pattern, context)
            if chloride_match and 'chloride' not in blocks_data[current_block]:
                blocks_data[current_block]['chloride'] = float(chloride_match.group(1))
    
    return blocks_data

def process_all_districts():
    """Process all district PDF files"""
    all_data = []
    
    # Get all district-wise PDF files
    pdf_files = sorted(ATLAS_DIR.glob("Districtwise Atlas - *.pdf"))
    
    print(f"Found {len(pdf_files)} district PDF files")
    
    for pdf_file in pdf_files:
        district_name = extract_district_name(pdf_file.name)
        if not district_name:
            continue
        
        print(f"\nProcessing: {district_name}")
        
        # Extract text from PDF
        text = extract_text_from_pdf(pdf_file)
        
        if text:
            # Parse water quality data
            blocks_data = parse_water_quality_data(text, district_name)
            
            # Add to all data
            for block_name, data in blocks_data.items():
                all_data.append(data)
                print(f"  - {block_name}: {len(data)} parameters")
        else:
            print(f"  Failed to extract text")
    
    return all_data

def save_to_javascript(data):
    """Save data as JavaScript module"""
    
    # Create JavaScript content
    js_content = """// Block-level Water Quality Data extracted from Rajasthan District Atlas PDFs
// Auto-generated file - Do not edit manually

/**
 * Water Quality Parameters:
 * - ec: Electrical Conductivity (µS/cm)
 * - fluoride: Fluoride concentration (mg/l)
 * - nitrate: Nitrate concentration (mg/l)
 * - iron: Iron concentration (mg/l)
 * - arsenic: Arsenic concentration (µg/l)
 * - uranium: Uranium concentration (µg/l)
 * - tds: Total Dissolved Solids (mg/l)
 * - ph: pH value
 * - chloride: Chloride concentration (mg/l)
 */

export const BLOCK_WATER_QUALITY_DATA = """
    
    # Convert to JSON with proper formatting
    js_content += json.dumps(data, indent=2)
    js_content += ";\n\n"
    
    # Add helper functions
    js_content += """
// Get water quality data for a specific district
export const getDistrictWaterQuality = (districtName) => {
  return BLOCK_WATER_QUALITY_DATA.filter(item => item.district === districtName);
};

// Get water quality data for a specific block
export const getBlockWaterQuality = (districtName, blockName) => {
  return BLOCK_WATER_QUALITY_DATA.find(
    item => item.district === districtName && item.block === blockName
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
    chloride: 1000   // mg/l
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
  
  if (issues.length === 0) {
    return { status: 'good', class: 'good', text: 'Good Quality', issues: [] };
  } else if (issues.length <= 2) {
    return { status: 'warning', class: 'warning', text: 'Moderate Quality', issues };
  } else {
    return { status: 'critical', class: 'critical', text: 'Poor Quality', issues };
  }
};
"""
    
    # Write to file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"\n✓ Data saved to: {OUTPUT_FILE}")
    print(f"✓ Total blocks processed: {len(data)}")

def main():
    """Main execution function"""
    print("=" * 60)
    print("Water Quality Data Extraction from District Atlas PDFs")
    print("=" * 60)
    
    # Check if Atlas directory exists
    if not ATLAS_DIR.exists():
        print(f"Error: Atlas directory not found: {ATLAS_DIR}")
        return
    
    # Process all districts
    data = process_all_districts()
    
    if data:
        # Save to JavaScript file
        save_to_javascript(data)
        print("\n" + "=" * 60)
        print("Extraction completed successfully!")
        print("=" * 60)
    else:
        print("\nNo data extracted. Please check the PDF files.")

if __name__ == "__main__":
    main()
