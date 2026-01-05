import re

# Read the DataAnalysisSidebar file
with open(r'D:\GIS_RSGWA_ANALYSIS\src\components\DataAnalysisSidebar.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the new pie charts code
with open(r'D:\GIS_RSGWA_ANALYSIS\docs\TEMP_PIE_CHARTS.txt', 'r', encoding='utf-8') as f:
    new_pie_charts = f.read()

# Find and replace the old pie chart section
# Pattern: from "Parameter Compliance Pie Chart" comment to just before "Water Quality Parameters Grid" comment
pattern = r'{/\* Parameter Compliance Pie Chart \*/}.*?(?={/\* Water Quality Parameters Grid \*/})'

# Replace with new individual pie charts
content = re.sub(pattern, new_pie_charts.strip() + '\n\n                                        ', content, flags=re.DOTALL)

# Write back
with open(r'D:\GIS_RSGWA_ANALYSIS\src\components\DataAnalysisSidebar.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully replaced pie chart section!")
print("Individual parameter pie charts are now in place.")
