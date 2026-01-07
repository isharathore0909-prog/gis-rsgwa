import pandas as pd
import datetime
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from rainfallApi.models import Rainfall
from raingaugeApi.models import RainGauge

class Command(BaseCommand):
    help = 'Load rainfall and raingauge data from Excel'

    def handle(self, *args, **options):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'
        log_file = 'import_all_log.txt'
        
        with open(log_file, 'w') as f:
            f.write(f"Starting import at {datetime.datetime.now()}\n")

        if not os.path.exists(file_path):
            with open(log_file, 'a') as f: f.write(f"File not found: {file_path}\n")
            return

        try:
            df = pd.read_excel(file_path)
            with open(log_file, 'a') as f: f.write(f"Read {len(df)} rows from Excel.\n")
        except Exception as e:
            with open(log_file, 'a') as f: f.write(f"Error reading Excel: {e}\n")
            return

        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        # Cache for performance
        districts = {}
        blocks = {}
        gps = {}
        villages = {}

        count = 0
        for index, row in df.iterrows():
            try:
                # Column mapping based on inspection
                d_name = str(row.get('District', '')).strip()
                b_name = str(row.get('Block', '')).strip()
                gp_name = str(row.get('Grampanchyat', '')).strip()
                v_name = str(row.get('Village Name', '')).strip()
                rf_val = row.get('Rainfall(in mm)', 0.0)
                dt_val = row.get('Rainfall Date')
                lat_val = row.get('Latitude', None)
                long_val = row.get('Longitude', None)
                g_type = str(row.get('Type of Rain Gauge', 'manual')).lower()

                if not d_name or d_name == 'nan' or not b_name or b_name == 'nan':
                    continue

                # 1. District
                if d_name not in districts:
                    districts[d_name], _ = District.objects.get_or_create(name=d_name, state=state)
                dist = districts[d_name]

                # 2. Block
                b_key = (d_name, b_name)
                if b_key not in blocks:
                    blocks[b_key], _ = Block.objects.get_or_create(name=b_name, district=dist)
                blk = blocks[b_key]

                # 3. Grampanchayat
                gp_key = (b_key, gp_name)
                if gp_key not in gps:
                    gps[gp_key], _ = Grampanchayat.objects.get_or_create(name=gp_name, block=blk)
                gp_obj = gps[gp_key]

                # 4. Village
                v_key = (gp_key, v_name)
                if v_key not in villages:
                    v_obj, created = Village.objects.get_or_create(
                        name=v_name, 
                        grampanchayat=gp_obj,
                        defaults={'latitude': lat_val if pd.notna(lat_val) else None, 
                                 'longitude': long_val if pd.notna(long_val) else None}
                    )
                    villages[v_key] = v_obj
                v_obj = villages[v_key]

                # 5. Date parsing
                if pd.isna(dt_val):
                    dt_val = datetime.date.today()
                elif isinstance(dt_val, str):
                    try:
                        dt_val = pd.to_datetime(dt_val).date()
                    except:
                        dt_val = datetime.date.today()
                elif isinstance(dt_val, datetime.datetime):
                    dt_val = dt_val.date()

                # 6. Rainfall Records
                # Use sub-transactions to avoid whole block failure if one row fails
                with transaction.atomic():
                    Rainfall.objects.update_or_create(
                        village=v_obj,
                        date=dt_val,
                        gauge_type=g_type if g_type in ['manual', 'automatic', 'telemetric'] else 'manual',
                        defaults={'rainfall_mm': rf_val if pd.notna(rf_val) else 0.0}
                    )
                    
                    RainGauge.objects.update_or_create(
                        village=v_obj,
                        date=dt_val,
                        gauge_type=g_type if g_type in ['manual', 'automatic', 'telemetric'] else 'manual',
                        defaults={
                            'rainfall_mm': rf_val if pd.notna(rf_val) else 0.0,
                            'latitude': lat_val if pd.notna(lat_val) else 0.0,
                            'longitude': long_val if pd.notna(long_val) else 0.0
                        }
                    )

                count += 1
                if count % 1000 == 0:
                    with open(log_file, 'a') as f: f.write(f"Processed {count} rows...\n")

            except Exception as e:
                with open(log_file, 'a') as f: f.write(f"Error at index {index}: {e}\n")

        with open(log_file, 'a') as f:
            f.write(f"Import complete! Total records: {count}\n")
            f.write(f"Finished at {datetime.datetime.now()}\n")
