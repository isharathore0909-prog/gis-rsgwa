import json
import random
from datetime import datetime, timedelta

def generate_rainfall_data(source_json, output_json):
    print(f"Opening {source_json}...")
    with open(source_json, 'r') as f:
        data = json.load(f)
    
    dist_blocks = {}
    for feature in data['features']:
        properties = feature['properties']
        dist = properties.get('DIST_NAME')
        block = properties.get('BLOCK_NAME')
        if dist and block:
            if dist not in dist_blocks:
                dist_blocks[dist] = set()
            dist_blocks[dist].add(block)
    
    print(f"Districts found: {len(dist_blocks)}")
    rainfall_records = []
    years = [2024, 2025]
    
    block_total = sum(len(b) for b in dist_blocks.values())
    block_count = 0
    
    print(f"Generating records for {block_total} blocks...")
    for dist, blocks in dist_blocks.items():
        for block in blocks:
            block_count += 1
            if block_count % 20 == 0:
                print(f"Progress: {block_count}/{block_total} blocks processed...")
            
            gp_name = f"{block} GP"
            village_name = f"{block} Village"
            
            # Reduce frequency slightly to speed up
            for year in years:
                for month in range(1, 13):
                    if month in [7, 8]: num_readings = 4
                    elif month in [6, 9]: num_readings = 2
                    else: num_readings = 1
                    
                    for i in range(num_readings):
                        day = random.randint(1, 28)
                        rainfall_date = f"{year}-{month:02d}-{day:02d}"
                        max_rain = 60 if month in [7, 8] else 10
                        rainfall_mm = round(random.uniform(0.1, max_rain), 2)
                        
                        rainfall_records.append({
                            "district": dist,
                            "block": block,
                            "gram_panchayat": gp_name,
                            "village": village_name,
                            "rainfall_in_mm": rainfall_mm,
                            "rainfall_date": rainfall_date
                        })
    
    print(f"Total records: {len(rainfall_records)}")
    rainfall_records.sort(key=lambda x: x['rainfall_date'])
    
    print(f"Saving to {output_json}...")
    with open(output_json, 'w') as f:
        json.dump(rainfall_records, f, indent=4)
    print("Done.")

if __name__ == "__main__":
    generate_rainfall_data(
        r"D:\GIS_RSGWA_ANALYSIS\FRONT_END\public\block_boundary.json",
        r"D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\rainfall_data.json"
    )
