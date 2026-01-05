import pandas as pd
import os

file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
else:
    try:
        df = pd.read_excel(file_path, nrows=5)
        print("Columns:", df.columns.tolist())
        print(df.head())
    except Exception as e:
        print(f"Error reading file: {e}")
