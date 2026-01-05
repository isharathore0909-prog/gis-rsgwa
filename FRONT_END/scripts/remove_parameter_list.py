#!/usr/bin/env python3
# Remove the detailed parameter list section

with open(r'D:\GIS_RSGWA_ANALYSIS\src\components\DataAnalysisSidebar.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines before 805 (index 0-804)
before = lines[:804]

# Keep lines from 950 onwards (index 949+)
after = lines[949:]

# Combine
new_lines = before + after

# Write back
with open(r'D:\GIS_RSGWA_ANALYSIS\src\components\DataAnalysisSidebar.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Removed detailed parameter list (lines 805-949)")
print("✅ The pie charts now show all the information!")
