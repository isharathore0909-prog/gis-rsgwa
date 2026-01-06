import pandas as pd
import sys
import os

file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'
output_file = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\inspection_result.txt'

try:
    with open(output_file, 'w') as f:
        f.write("Starting inspection...\n")

    # Read only a few rows
    df = pd.read_excel(file_path, nrows=5)
    
    with open(output_file, 'a') as f:
        f.write(f"Columns: {df.columns.tolist()}\n")
        f.write(f"First row: {df.iloc[0].to_dict()}\n")
        f.write("Done.\n")

except Exception as e:
    with open(output_file, 'a') as f:
        f.write(f"Error: {e}\n")
