import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from pizometerApi.models import Piezometer
import datetime
import os

class Command(BaseCommand):
    help = 'Load piezometer data from Excel file'

    def handle(self, *args, **kwargs):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\Rainfall\pizeometer_data.xlsx'
        log_file = 'piezometer_import_log.txt'
        
        def log(msg, style=None):
            if style:
                self.stdout.write(style(msg))
            else:
                self.stdout.write(msg)
            try:
                with open(log_file, 'a') as f:
                    f.write(f"[{datetime.datetime.now()}] {msg}\n")
            except:
                pass

        with open(log_file, 'w') as f:
            f.write(f"Starting piezometer import at {datetime.datetime.now()}...\n")
        
        log("Starting import...")

        if not os.path.exists(file_path):
            log(f"File not found: {file_path}", self.style.ERROR)
            return

        try:
            log(f"Reading file: {file_path}")
            df = pd.read_excel(file_path)
            log(f"Total rows read: {len(df)}")
        except Exception as e:
            log(f"Error reading excel: {e}", self.style.ERROR)
            return

        # Normalized column names for easier matching
        raw_cols = df.columns.tolist()
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        col_district = next((c for c in df.columns if 'district' in c), None)
        col_block = next((c for c in df.columns if 'block' in c), None)
        col_gp = next((c for c in df.columns if 'gram' in c or 'gp' in c), None)
        col_village = next((c for c in df.columns if 'village' in c), None)
        col_name = next((c for c in df.columns if 'site_name' in c or 'piezometer' in c), None)
        col_lat = next((c for c in df.columns if 'latitude' in c), None)
        col_lon = next((c for c in df.columns if 'longitude' in c), None)

        # Identify water level columns (e.g., Pre_2015, Pst_2016, Post_2022)
        wl_cols = [c for c in df.columns if 'pre_' in c or 'pst_' in c or 'post_' in c]
        log(f"Found {len(wl_cols)} water level columns: {wl_cols}")

        if not all([col_district, col_block, col_village]):
             log("Critical location columns missing. Aborting.", self.style.ERROR)
             return

        country_obj, _ = Country.objects.get_or_create(name='India')
        state_obj, _ = State.objects.get_or_create(name='Rajasthan', country=country_obj)
        
        districts = {d.name.lower(): d for d in District.objects.filter(state=state_obj)}
        blocks = {} 
        gps = {} 
        villages = {} 

        total_records = 0
        created_count = 0
        
        for index, row in df.iterrows():
            try:
                d_name = str(row[col_district]).strip() if pd.notna(row[col_district]) else ""
                b_name = str(row[col_block]).strip() if pd.notna(row[col_block]) else ""
                gp_name = str(row[col_gp]).strip() if col_gp and pd.notna(row[col_gp]) else "Unknown"
                v_name = str(row[col_village]).strip() if pd.notna(row[col_village]) else ""
                p_name = str(row[col_name]).strip() if col_name and pd.notna(row[col_name]) else v_name
                lat_val = row[col_lat] if col_lat and pd.notna(row.get(col_lat)) else None
                lon_val = row[col_lon] if col_lon and pd.notna(row.get(col_lon)) else None

                if not d_name or not b_name or not v_name:
                    continue

                # Get or Create Location Hierarchy
                d_low = d_name.lower()
                if d_low not in districts:
                    districts[d_low], _ = District.objects.get_or_create(name=d_name, state=state_obj)
                dist_obj = districts[d_low]

                b_key = (dist_obj.id, b_name.lower())
                if b_key not in blocks:
                    blocks[b_key], _ = Block.objects.get_or_create(name=b_name, district=dist_obj)
                block_obj = blocks[b_key]

                gp_key = (block_obj.id, gp_name.lower())
                if gp_key not in gps:
                    gps[gp_key], _ = Grampanchayat.objects.get_or_create(name=gp_name, block=block_obj)
                gp_obj = gps[gp_key]

                v_key = (gp_obj.id, v_name.lower())
                if v_key not in villages:
                    v_obj, created = Village.objects.get_or_create(
                        name=v_name, 
                        grampanchayat=gp_obj,
                        defaults={'latitude': lat_val, 'longitude': lon_val}
                    )
                    villages[v_key] = v_obj
                v_obj = villages[v_key]

                # Process each water level column as a separate record
                for col in wl_cols:
                    val = row[col]
                    if pd.isna(val):
                        continue
                    
                    try:
                        depth_float = float(val)
                    except:
                        continue

                    # Parsing year and season from column name (e.g., pre_2015, post_2022)
                    parts = col.split('_')
                    if len(parts) < 2: continue
                    
                    season = parts[0] # pre or pst/post
                    try:
                        year = int(parts[1])
                    except:
                        continue

                    # Mapping season to approximate dates
                    # Pre-monsoon: May 15th, Post-monsoon: Nov 15th
                    if 'pre' in season:
                        res_date = datetime.date(year, 5, 15)
                    else:
                        res_date = datetime.date(year, 11, 15)

                    # Create/Update Piezometer record
                    _, created = Piezometer.objects.update_or_create(
                        village=v_obj,
                        date=res_date,
                        piezometer_name=p_name,
                        defaults={
                            'water_level_depth': depth_float,
                            'latitude': lat_val,
                            'longitude': lon_val
                        }
                    )
                    if created: created_count += 1
                    total_records += 1

            except Exception as e:
                log(f"Row {index} error: {e}", self.style.ERROR)
            
            if (index + 1) % 100 == 0:
                log(f"Processed {index+1}/{len(df)} rows...")

        log(f"Import complete. Total records created/updated: {total_records}", self.style.SUCCESS)
