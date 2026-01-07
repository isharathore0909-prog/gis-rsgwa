import pandas as pd
import datetime
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from water_qualityApi.models import WaterQuality

class Command(BaseCommand):
    help = 'Load water quality data from cleaned_FTK_C.xlsx'

    def handle(self, *args, **options):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\cleaned_FTK_C.xlsx'
        log_file = 'water_quality_import_log.txt'
        
        def log(msg):
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            full_msg = f"[{timestamp}] {msg}"
            self.stdout.write(full_msg)
            with open(log_file, 'a') as f:
                f.write(full_msg + "\n")

        with open(log_file, 'w') as f:
            f.write(f"Starting water quality import at {datetime.datetime.now()}\n")

        if not os.path.exists(file_path):
            log(f"File not found: {file_path}")
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
        
        # Helper function to find columns
        def find_col(keywords, exclude=None):
            for k in keywords:
                for c in df.columns:
                    if k == c:
                        return c
            for k in keywords:
                for c in df.columns:
                    if k in c:
                        if exclude and any(e in c for e in exclude):
                            continue
                        return c
            return None

        # Map columns
        col_map = {
            'state': find_col(['state']),
            'district': find_col(['district']),
            'block': find_col(['block', 'taluka']),
            'gp': find_col(['grampanch', 'gp', 'gram panch']),
            'village': find_col(['village name', 'village']),
            'latitude': find_col(['latitude', 'lat']),
            'longitude': find_col(['longitude', 'long', 'lon']),
            'well_id': find_col(['well id', 'well_id', 'id', 'station id', 'station_id']),
            'well_type': find_col(['type of well', 'well type', 'type_of_well']),
            'well_depth': find_col(['well depth', 'depth']),
            'meta_date': find_col(['date', 'meta date', 'meta_date', 'sampling date']),
            'ph': find_col(['ph']),
            'hardness': find_col(['hardness']),
            'alkalinity': find_col(['alkalinity']),
            'nitrate': find_col(['nitrate', 'no3']),
            'fluoride': find_col(['fluoride', 'f']),
            'ec': find_col(['ec', 'electrical conductivity', 'conductivity']),
            'tds': find_col(['tds', 'total dissolved solids']),
        }

        log(f"Column Mapping: {col_map}")

        # Check critical columns
        if not all([col_map['district'], col_map['village']]):
            log("Critical columns missing (district, village). Aborting.")
            return

        log("Preparing location caches...")
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        # Pre-load locations
        districts = {obj.name.strip().lower(): obj for obj in District.objects.filter(state=state)}
        blocks = {}
        for b in Block.objects.select_related('district').filter(district__state=state):
            blocks[(b.district_id, b.name.strip().lower())] = b
            
        gps = {}
        for gp in Grampanchayat.objects.select_related('block').filter(block__district__state=state):
            gps[(gp.block_id, gp.name.strip().lower())] = gp
            
        villages = {}
        for v in Village.objects.select_related('grampanchayat').filter(grampanchayat__block__district__state=state):
            villages[(v.grampanchayat_id, v.name.strip().lower())] = v

        log(f"Caches ready. Districts: {len(districts)}, Blocks: {len(blocks)}, GPs: {len(gps)}, Villages: {len(villages)}")

        batch_size = 500
        total_created = 0
        total_updated = 0
        total_errors = 0
        
        log("Processing rows in batches...")

        for start in range(0, len(df), batch_size):
            end = min(start + batch_size, len(df))
            chunk = df.iloc[start:end]
            
            with transaction.atomic():
                for index, row in chunk.iterrows():
                    try:
                        # Extract location data
                        d_name = str(row[col_map['district']]).strip() if col_map['district'] and pd.notna(row[col_map['district']]) else None
                        b_name = str(row[col_map['block']]).strip() if col_map['block'] and pd.notna(row[col_map['block']]) else "Unknown"
                        gp_name = str(row[col_map['gp']]).strip() if col_map['gp'] and pd.notna(row[col_map['gp']]) else "Unknown"
                        v_name = str(row[col_map['village']]).strip() if col_map['village'] and pd.notna(row[col_map['village']]) else None
                        
                        if not d_name or d_name.lower() == 'nan' or not v_name or v_name.lower() == 'nan':
                            continue

                        # Get or create location hierarchy
                        d_key = d_name.lower()
                        if d_key not in districts:
                            districts[d_key], _ = District.objects.get_or_create(name=d_name, state=state)
                        dist = districts[d_key]

                        b_key = (dist.id, b_name.lower())
                        if b_key not in blocks:
                            blocks[b_key], _ = Block.objects.get_or_create(name=b_name, district=dist)
                        blk = blocks[b_key]

                        gp_key = (blk.id, gp_name.lower())
                        if gp_key not in gps:
                            gps[gp_key], _ = Grampanchayat.objects.get_or_create(name=gp_name, block=blk)
                        gp_obj = gps[gp_key]

                        v_key = (gp_obj.id, v_name.lower())
                        lat_val = float(row[col_map['latitude']]) if col_map['latitude'] and pd.notna(row[col_map['latitude']]) else None
                        lon_val = float(row[col_map['longitude']]) if col_map['longitude'] and pd.notna(row[col_map['longitude']]) else None

                        if v_key not in villages:
                            v_obj, created = Village.objects.get_or_create(
                                name=v_name, 
                                grampanchayat=gp_obj,
                                defaults={'latitude': lat_val, 'longitude': lon_val}
                            )
                            villages[v_key] = v_obj
                        
                        v_obj = villages[v_key]
                        
                        # Update village coordinates if missing
                        if (v_obj.latitude is None or v_obj.longitude is None) and (lat_val is not None or lon_val is not None):
                            v_obj.latitude = lat_val if v_obj.latitude is None else v_obj.latitude
                            v_obj.longitude = lon_val if v_obj.longitude is None else v_obj.longitude
                            v_obj.save()

                        # Extract well data
                        well_id = str(row[col_map['well_id']]).strip() if col_map['well_id'] and pd.notna(row[col_map['well_id']]) else f"WELL-{v_name}-{index}"
                        
                        well_type = str(row[col_map['well_type']]).lower() if col_map['well_type'] and pd.notna(row[col_map['well_type']]) else 'bore_well'
                        # Map well type variations
                        if 'bore' in well_type or 'tube' in well_type:
                            well_type = 'bore_well'
                        elif 'dug' in well_type:
                            well_type = 'dug_well'
                        elif 'hand' in well_type or 'pump' in well_type:
                            well_type = 'hand_pump'
                        elif 'open' in well_type:
                            well_type = 'open_well'
                        else:
                            well_type = 'bore_well'
                        
                        try:
                            well_depth = float(row[col_map['well_depth']]) if col_map['well_depth'] and pd.notna(row[col_map['well_depth']]) else None
                        except (ValueError, TypeError):
                            well_depth = None

                        # Parse date
                        meta_date = row[col_map['meta_date']] if col_map['meta_date'] and pd.notna(row[col_map['meta_date']]) else datetime.date.today()
                        if isinstance(meta_date, str):
                            try:
                                meta_date = pd.to_datetime(meta_date).date()
                            except:
                                meta_date = datetime.date.today()
                        elif isinstance(meta_date, (datetime.datetime, pd.Timestamp)):
                            meta_date = meta_date.date()

                        # Extract water quality parameters
                        def safe_float(col_key):
                            if not col_map[col_key]:
                                return None
                            try:
                                val = row[col_map[col_key]]
                                if pd.notna(val):
                                    return float(val)
                            except (ValueError, TypeError):
                                pass
                            return None

                        ph = safe_float('ph')
                        hardness = safe_float('hardness')
                        alkalinity = safe_float('alkalinity')
                        nitrate = safe_float('nitrate')
                        fluoride = safe_float('fluoride')
                        ec = safe_float('ec')
                        tds = safe_float('tds')

                        # Create or update water quality record
                        wq_obj, created = WaterQuality.objects.update_or_create(
                            well_id=well_id,
                            meta_date=meta_date,
                            defaults={
                                'village': v_obj,
                                'latitude': lat_val,
                                'longitude': lon_val,
                                'type_of_well': well_type,
                                'well_depth': well_depth,
                                'ph': ph,
                                'hardness': hardness,
                                'alkalinity': alkalinity,
                                'nitrate': nitrate,
                                'fluoride': fluoride,
                                'ec': ec,
                                'tds': tds,
                            }
                        )

                        if created:
                            total_created += 1
                        else:
                            total_updated += 1

                    except Exception as e:
                        total_errors += 1
                        log(f"Error at row {index}: {e}")
            
            log(f"Processed {end}/{len(df)} rows... (Created: {total_created}, Updated: {total_updated}, Errors: {total_errors})")

        log(f"Import complete! Created: {total_created}, Updated: {total_updated}, Errors: {total_errors}")
        log(f"Finished at {datetime.datetime.now()}")
