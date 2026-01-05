#!/usr/bin/env python3
# Simple script to replace pie chart section

# Read the main file
with open(r'D:\GIS_RSGWA_ANALYSIS\src\components\DataAnalysisSidebar.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Read the new pie charts
with open(r'D:\GIS_RSGWA_ANALYSIS\docs\TEMP_PIE_CHARTS.txt', 'r', encoding='utf-8') as f:
    new_content = f.read()

# Keep lines before 585 (index 0-584)
before = lines[:584]

# Keep lines from 697 onwards (index 696+)
after = lines[696:]

# Combine
new_lines = before + [new_content + '\n'] + after

# Write back
with open(r'D:\GIS_RSGWA_ANALYSIS\src\components\DataAnalysisSidebar.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Done! Replaced lines 585-696 with individual pie charts")
