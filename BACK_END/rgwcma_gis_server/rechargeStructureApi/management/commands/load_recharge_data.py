import pandas as pd
import datetime
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from locationApi.models import District, Block, Grampanchayat, Village, State, Country
from rechargeStructureApi.models import RechargeStructure

class Command(BaseCommand):
    help = 'Load recharge structure data from Excel file'

    def handle(self, *args, **options):
        # Look for file in the parent of the project root (BACK_END)
        base_dir = settings.BASE_DIR
        # This assumes BASE_DIR is .../rgwcma_gis_server
        # We want .../BACK_END/recharge_data.xlsx (example name)
        file_path = os.path.join(os.path.dirname(base_dir), 'recharge_data.xlsx')
        
        log_file = 'recharge_import_log.txt'
        
        def log(msg):
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            full_msg = f"[{timestamp}] {msg}"
            self.stdout.write(full_msg)
            with open(log_file, 'a') as f:
                f.write(full_msg + "\n")

        with open(log_file, 'w') as f:
            f.write(f"Starting recharge structure import at {datetime.datetime.now()}\n")

        if not os.path.exists(file_path):
            log(f"File not found: {file_path}")
            log("Please ensure 'recharge_data.xlsx' is in the BACK_END directory.")
            return

        log("Reading Excel file...")
        try:
            df = pd.read_excel(file_path, engine='openpyxl')
            log(f"Read {len(df)} rows from Excel.")
        except Exception as e:
            log(f"Error reading Excel: {e}")
            return

        # Normalize column names
        df.columns = [str(c).strip().lower() for c in df.columns]
        log(f"Columns found: {df.columns.tolist()}")

        # Helper to find columns
        def find_col(keywords):
            for k in keywords:
                for c in df.columns:
                    if k in c:
                        return c
            return None

        # Column Mapping - Adjust these keywords based on actual Excel headers
        col_map = {
            'district': find_col(['district']),
            'block': find_col(['block', 'taluka']),
            'gp': find_col(['grampanch', 'gp', 'gram panch']),
            'village': find_col(['village']),
            'latitude': find_col(['latitude', 'lat']),
            'longitude': find_col(['longitude', 'long']),
            'structure_type': find_col(['structure', 'type']),
            'storage_capacity': find_col(['capacity', 'storage']),
            'other': find_col(['other', 'remark']),
        }
        
        log(f"Column Mapping: {col_map}")

        if not all([col_map['district'], col_map['village']]):
            log("Critical columns missing (district, village). Aborting.")
            return

        # Prepare Caches
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)
        
        districts = {obj.name.strip().lower(): obj for obj in District.objects.filter(state=state)}
        blocks = {} # (dist_id, name) -> obj
        gps = {} # (block_id, name) -> obj
        villages = {} # (gp_id, name) -> obj

        # Populate caches lazily or eager? Eager is better for bulk.
        # (Same logic as water quality loader - omitted for brevity, will rely on DB hits or simple cache)
        # Using simple cache strategy as in water quality loader for consistency
        for b in Block.objects.filter(district__state=state):
            blocks[(b.district_id, b.name.strip().lower())] = b
        for g in Grampanchayat.objects.filter(block__district__state=state):
            gps[(g.block_id, g.name.strip().lower())] = g
        for v in Village.objects.filter(grampanchayat__block__district__state=state):
            villages[(v.grampanchayat_id, v.name.strip().lower())] = v

        batch_size = 500
        total_created = 0
        total_errors = 0

        for start in range(0, len(df), batch_size):
            end = min(start + batch_size, len(df))
            chunk = df.iloc[start:end]
            
            with transaction.atomic():
                for index, row in chunk.iterrows():
                    try:
                        # 1. Resolve Location
                        d_name = str(row[col_map['district']]).strip()
                        v_name = str(row[col_map['village']]).strip()
                        if not d_name or d_name.lower() == 'nan': continue
                        
                        # District
                        d_key = d_name.lower()
                        if d_key not in districts:
                            districts[d_key] = District.objects.create(name=d_name, state=state)
                        dist = districts[d_key]

                        # Block (Optional/Auto-create)
                        b_name = "Unknown"
                        if col_map['block'] and pd.notna(row[col_map['block']]):
                            b_name = str(row[col_map['block']]).strip()
                        
                        b_key = (dist.id, b_name.lower())
                        if b_key not in blocks:
                            blocks[b_key] = Block.objects.create(name=b_name, district=dist)
                        blk = blocks[b_key]

                        # GP (Optional/Auto-create)
                        gp_name = "Unknown"
                        if col_map['gp'] and pd.notna(row[col_map['gp']]):
                            gp_name = str(row[col_map['gp']]).strip()
                        
                        gp_key = (blk.id, gp_name.lower())
                        if gp_key not in gps:
                            gps[gp_key] = Grampanchayat.objects.create(name=gp_name, block=blk)
                        gp = gps[gp_key]

                        # Village
                        v_key = (gp.id, v_name.lower())
                        if v_key not in villages:
                            villages[v_key] = Village.objects.create(name=v_name, grampanchayat=gp)
                        village = villages[v_key]

                        # 2. Extract Data
                        lat = None
                        lon = None
                        if col_map['latitude'] and pd.notna(row[col_map['latitude']]):
                            try: lat = float(row[col_map['latitude']])
                            except: pass
                        if col_map['longitude'] and pd.notna(row[col_map['longitude']]):
                            try: lon = float(row[col_map['longitude']])
                            except: pass
                        
                        # Update village lat/lon if missing
                        if (lat or lon) and (not village.latitude or not village.longitude):
                            village.latitude = lat or village.latitude
                            village.longitude = lon or village.longitude
                            village.save()

                        st_type = None
                        if col_map['structure_type'] and pd.notna(row[col_map['structure_type']]):
                            st_type = str(row[col_map['structure_type']])

                        capacity = None
                        if col_map['storage_capacity'] and pd.notna(row[col_map['storage_capacity']]):
                            try: capacity = float(row[col_map['storage_capacity']])
                            except: pass
                        
                        other = None
                        if col_map['other'] and pd.notna(row[col_map['other']]):
                            other = str(row[col_map['other']])

                        # 3. Create Record
                        RechargeStructure.objects.create(
                            village=village,
                            structure_type=st_type,
                            latitude=lat,
                            longitude=lon,
                            storage_capacity=capacity,
                            other_recharge_structures=other
                        )
                        total_created += 1

                    except Exception as e:
                        total_errors += 1
                        log(f"Error row {index}: {e}")

        log(f"Import complete. Created: {total_created}, Errors: {total_errors}")
