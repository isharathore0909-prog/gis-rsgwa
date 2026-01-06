import json
import random

districts = {
    "AJMER": ["Bhinay", "Kishangarh", "Kekri", "Arain"],
    "JAIPUR": ["Amber", "Jhotwara", "Chasu", "Phagi"],
    "UDAIPUR": ["Girwa", "Gogunda", "Jhadol", "Salumbar"],
    "JODHPUR": ["Luni", "Phalodi", "Osian", "Shergarh"],
    "BIKANER": ["Lunkaransar", "Nokha", "Khajuwala"]
}

records = []
years = [2024, 2025]

for dist, blocks in districts.items():
    for block in blocks:
        gp = f"{block} GP"
        village = f"{block} Village"
        for year in years:
            for month in range(1, 13):
                # Peak Monsoon: July, August (4 readings)
                # Shoulder: June, Sept (2 readings)
                # Winter: Jan, Feb (1 reading)
                # Dry: others (rare reading)
                if month in [7, 8]: num = 10
                elif month in [6, 9]: num = 5
                elif month in [1, 2]: num = 2
                else: num = 1
                
                for d in range(num):
                    day = random.randint(1, 28)
                    date = f"{year}-{month:02d}-{day:02d}"
                    max_r = 70 if month in [7, 8] else 15
                    mm = round(random.uniform(0.5, max_r), 2)
                    records.append({
                        "district": dist,
                        "block": block,
                        "gram_panchayat": gp,
                        "village": village,
                        "rainfall_in_mm": mm,
                        "rainfall_date": date
                    })

records.sort(key=lambda x: x['rainfall_date'])
with open(r"D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\rainfall_data.json", 'w') as f:
    json.dump(records, f, indent=4)
print(f"Generated {len(records)} records.")
