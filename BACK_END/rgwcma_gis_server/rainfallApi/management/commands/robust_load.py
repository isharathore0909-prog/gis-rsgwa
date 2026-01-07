import pandas as pd
import datetime
import os
import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from rainfallApi.models import Rainfall
from raingaugeApi.models import RainGauge

class Command(BaseCommand):
    help = 'Load rainfall and raingauge data from Excel with optimization'

    def handle(self, *args, **options):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'
        log_file = 'robust_import_log.txt'
        
        def log(msg):
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            full_msg = f"[{timestamp}] {msg}"
            self.stdout.write(full_msg)
            with open(log_file, 'a') as f:
                f.write(full_msg + "\n")

        with open(log_file, 'w') as f:
            f.write(f"Starting robust import at {datetime.datetime.now()}\n")

        if not os.path.exists(file_path):
            log(f"File not found: {file_path}")
            return

        log("Reading Excel file (this may take a while for 450k+ rows)...")
        try:
            # We use engine='openpyxl' for better compatibility with large files
            df = pd.read_excel(file_path, engine='openpyxl')
            log(f"Read {len(df)} rows from Excel.")
        except Exception as e:
            log(f"Error reading Excel: {e}")
            return

        # Normalize columns
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Helper to find column accurately
        def find_col(keywords, exclude=None):
            # Try to find exact matches first
            for k in keywords:
                for c in df.columns:
                    if k == c:
                        return c
            # Try to find partial matches
            for k in keywords:
                for c in df.columns:
                    if k in c:
                        if exclude and any(e in c for e in exclude):
                            continue
                        return c
            return None

        col_map = {
            'district': find_col(['district']),
            'block': find_col(['block']),
            'gp': find_col(['grampanch', 'gp']),
            'village': find_col(['village name', 'village', 'location', 'station']),
            'rainfall': find_col(['rainfall(in mm)', 'rainfall'], exclude=['gauge', 'date']),
            'date': find_col(['rainfall date', 'date'], exclude=['gauge']),
            'gauge': find_col(['gauge']),
            'lat': find_col(['latitude', 'lat']),
            'lon': find_col(['longitude', 'lon', 'long']),
        }

        log(f"Column Mapping: {col_map}")

        if not all([col_map['district'], col_map['block'], col_map['village'], col_map['rainfall']]):
            log("Critical columns missing. Mapping failed.")
            return

        log("Preparing Caches...")
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        # Pre-load all locations into memory for fast lookup
        districts = {obj.name.strip().lower(): obj for obj in District.objects.filter(state=state)}
        blocks = {} # (dist_id, name_lower) -> Block
        for b in Block.objects.select_related('district').filter(district__state=state):
            blocks[(b.district_id, b.name.strip().lower())] = b
            
        gps = {} # (block_id, name_lower) -> Grampanchayat
        for gp in Grampanchayat.objects.select_related('block').filter(block__district__state=state):
            gps[(gp.block_id, gp.name.strip().lower())] = gp
            
        villages = {} # (gp_id, name_lower) -> Village
        for v in Village.objects.select_related('grampanchayat').filter(grampanchayat__block__district__state=state):
            villages[(v.grampanchayat_id, v.name.strip().lower())] = v

        log(f"Caches ready. Districts: {len(districts)}, Blocks: {len(blocks)}, GPs: {len(gps)}, Villages: {len(villages)}")

        batch_size = 1000
        total_created = 0
        
        log("Processing rows in batches...")

        for start in range(0, len(df), batch_size):
            end = min(start + batch_size, len(df))
            chunk = df.iloc[start:end]
            
            with transaction.atomic():
                for index, row in chunk.iterrows():
                    try:
                        d_name = str(row[col_map['district']]).strip()
                        b_name = str(row[col_map['block']]).strip()
                        gp_name = str(row[col_map['gp']]).strip() if col_map['gp'] and pd.notna(row[col_map['gp']]) else "Unknown"
                        v_name = str(row[col_map['village']]).strip()
                        
                        if not d_name or d_name.lower() == 'nan' or not b_name or b_name.lower() == 'nan' or not v_name or v_name.lower() == 'nan':
                            continue

                        # 1. District
                        d_key = d_name.lower()
                        if d_key not in districts:
                            districts[d_key], _ = District.objects.get_or_create(name=d_name, state=state)
                        dist = districts[d_key]

                        # 2. Block
                        b_key = (dist.id, b_name.lower())
                        if b_key not in blocks:
                            blocks[b_key], _ = Block.objects.get_or_create(name=b_name, district=dist)
                        blk = blocks[b_key]

                        # 3. Grampanchayat
                        gp_key = (blk.id, gp_name.lower())
                        if gp_key not in gps:
                            gps[gp_key], _ = Grampanchayat.objects.get_or_create(name=gp_name, block=blk)
                        gp_obj = gps[gp_key]

                        # 4. Village
                        v_key = (gp_obj.id, v_name.lower())
                        lat_val = row[col_map['lat']] if col_map['lat'] and pd.notna(row[col_map['lat']]) else None
                        lon_val = row[col_map['lon']] if col_map['lon'] and pd.notna(row[col_map['lon']]) else None

                        if v_key not in villages:
                            v_obj, created = Village.objects.get_or_create(
                                name=v_name, 
                                grampanchayat=gp_obj,
                                defaults={'latitude': lat_val, 'longitude': lon_val}
                            )
                            villages[v_key] = v_obj
                        
                        v_obj = villages[v_key]
                        # Update coordinates if missing
                        if (v_obj.latitude is None or v_obj.longitude is None) and (lat_val is not None or lon_val is not None):
                            v_obj.latitude = lat_val if v_obj.latitude is None else v_obj.latitude
                            v_obj.longitude = lon_val if v_obj.longitude is None else v_obj.longitude
                            v_obj.save()

                        # 5. Data values
                        try:
                            rf_val = float(row[col_map['rainfall']]) if pd.notna(row[col_map['rainfall']]) else 0.0
                        except (ValueError, TypeError):
                            rf_val = 0.0
                            
                        dt_val = row[col_map['date']] if col_map['date'] and pd.notna(row[col_map['date']]) else datetime.date.today()
                        
                        if isinstance(dt_val, str):
                            try:
                                dt_val = pd.to_datetime(dt_val).date()
                            except:
                                dt_val = datetime.date.today()
                        elif isinstance(dt_val, datetime.datetime):
                            dt_val = dt_val.date()
                        elif isinstance(dt_val, pd.Timestamp):
                            dt_val = dt_val.date()

                        g_type = str(row[col_map['gauge']]).lower() if col_map['gauge'] and pd.notna(row[col_map['gauge']]) else 'manual'
                        if 'auto' in g_type: g_type = 'automatic'
                        elif 'tele' in g_type: g_type = 'telemetric'
                        else: g_type = 'manual'

                        # 6. Update or Create records
                        Rainfall.objects.update_or_create(
                            village=v_obj,
                            date=dt_val,
                            gauge_type=g_type,
                            defaults={'rainfall_mm': rf_val, 'latitude': lat_val, 'longitude': lon_val}
                        )
                        
                        RainGauge.objects.update_or_create(
                            village=v_obj,
                            date=dt_val,
                            gauge_type=g_type,
                            defaults={
                                'rainfall_mm': rf_val,
                                'latitude': lat_val if lat_val is not None else 0.0,
                                'longitude': lon_val if lon_val is not None else 0.0
                            }
                        )

                        total_created += 1

                    except Exception as e:
                        log(f"Error at row {index}: {e}")
            
            log(f"Processed {end}/{len(df)} rows...")

        log(f"Import complete! Total records processed: {total_created}")
        log(f"Finished at {datetime.datetime.now()}")
