import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from rainfallApi.models import Rainfall
import datetime
import os
import sys

class Command(BaseCommand):
    help = 'Load rainfall data from Excel file'

    def handle(self, *args, **kwargs):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'
        log_file = 'import_log.txt'
        
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
            f.write(f"Starting import at {datetime.datetime.now()}...\n")
        
        log("Starting import...")

        if not os.path.exists(file_path):
            log(f"File not found: {file_path}", self.style.ERROR)
            return

        try:
            log(f"Reading file: {file_path}")
            # Reading entire file now. 45MB might take some memory but should be okay.
            df = pd.read_excel(file_path)
            log(f"Total rows read: {len(df)}")
            log(f"Columns found: {df.columns.tolist()}")
        except Exception as e:
            log(f"Error reading excel: {e}", self.style.ERROR)
            return

        # Normalized column mapping
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        col_district = next((c for c in df.columns if 'district' in c), None)
        col_block = next((c for c in df.columns if 'block' in c), None)
        col_gp = next((c for c in df.columns if 'grampanch' in c or 'gp' in c), None)
        col_village = next((c for c in df.columns if 'village' in c or 'location' in c or 'station' in c), None)
        col_rainfall = next((c for c in df.columns if 'rainfall(in mm)' in c or 'rain' in c), None)
        col_date = next((c for c in df.columns if 'rainfall date' in c or 'date' in c), None)
        col_gauge = next((c for c in df.columns if 'gauge' in c), None)
        col_lat = next((c for c in df.columns if 'latitude' in c), None)
        col_lon = next((c for c in df.columns if 'longitude' in c), None)
        
        log(f"Mapped: Dist={col_district}, Block={col_block}, GP={col_gp}, Village={col_village}, RF={col_rainfall}, Date={col_date}, Lat={col_lat}, Lon={col_lon}")

        if not all([col_district, col_block, col_village, col_rainfall]):
             log("Critical columns missing. Aborting.", self.style.ERROR)
             return

        # Caches to avoid redundant DB queries
        country_obj, _ = Country.objects.get_or_create(name='India')
        state_obj, _ = State.objects.get_or_create(name='Rajasthan', country=country_obj)
        
        districts = {d.name: d for d in District.objects.filter(state=state_obj)}
        blocks = {} # (district_id, block_name) -> Block
        gps = {} # (block_id, gp_name) -> GP
        villages = {} # (gp_id, village_name) -> Village

        count = 0
        created_count = 0
        updated_count = 0
        
        # Batch processing to handle large data and avoid memory/lock issues
        batch_size = 500
        total_rows = len(df)
        
        for start in range(0, total_rows, batch_size):
            end = min(start + batch_size, total_rows)
            chunk = df.iloc[start:end]
            
            with transaction.atomic():
                for index, row in chunk.iterrows():
                    try:
                        d_name = str(row[col_district]).strip()
                        b_name = str(row[col_block]).strip()
                        gp_name = str(row[col_gp]).strip() if pd.notna(row.get(col_gp)) else "Unknown"
                        v_name = str(row[col_village]).strip()
                        rf_val = row[col_rainfall]
                        date_val = row.get(col_date)
                        gauge_val = row.get(col_gauge, 'manual')
                        lat_val = row.get(col_lat) if pd.notna(row.get(col_lat)) else None
                        lon_val = row.get(col_lon) if pd.notna(row.get(col_lon)) else None

                        if any(pd.isna(x) for x in [d_name, b_name, v_name]):
                            continue

                        # District
                        if d_name not in districts:
                            districts[d_name], _ = District.objects.get_or_create(name=d_name, state=state_obj)
                        dist_obj = districts[d_name]

                        # Block
                        b_key = (dist_obj.id, b_name)
                        if b_key not in blocks:
                            blocks[b_key], _ = Block.objects.get_or_create(name=b_name, district=dist_obj)
                        block_obj = blocks[b_key]

                        # GP
                        gp_key = (block_obj.id, gp_name)
                        if gp_key not in gps:
                            gps[gp_key], _ = Grampanchayat.objects.get_or_create(name=gp_name, block=block_obj)
                        gp_obj = gps[gp_key]

                        # Village
                        v_key = (gp_obj.id, v_name)
                        if v_key not in villages:
                            v_obj, created = Village.objects.get_or_create(
                                name=v_name, 
                                grampanchayat=gp_obj,
                                defaults={'latitude': lat_val, 'longitude': lon_val}
                            )
                            # If already exists but lat/long missing, update them
                            if not created and (v_obj.latitude is None or v_obj.longitude is None):
                                v_obj.latitude = lat_val
                                v_obj.longitude = lon_val
                                v_obj.save()
                            villages[v_key] = v_obj
                        v_obj = villages[v_key]

                        # Date Parsing
                        if pd.isna(date_val):
                            date_obj = datetime.date.today()
                        elif isinstance(date_val, (datetime.datetime, pd.Timestamp)):
                            date_obj = date_val.date()
                        else:
                            try:
                                date_obj = pd.to_datetime(date_val).date()
                            except:
                                date_obj = datetime.date.today()

                        # Rainfall Parsing
                        try:
                            rainfall_float = float(rf_val)
                        except:
                            rainfall_float = 0.0

                        # Gauge Type
                        g_type = str(gauge_val).lower()
                        if 'auto' in g_type: g_type = 'automatic'
                        elif 'tele' in g_type: g_type = 'telemetric'
                        else: g_type = 'manual'

                        # Rainfall Record
                        obj, created = Rainfall.objects.update_or_create(
                            village=v_obj,
                            date=date_obj,
                            gauge_type=g_type,
                            defaults={
                                'rainfall_mm': rainfall_float,
                                'latitude': lat_val,
                                'longitude': lon_val
                            }
                        )
                        
                        if created: created_count += 1
                        else: updated_count += 1
                        count += 1

                    except Exception as e:
                        log(f"Row {index} error: {e}", self.style.ERROR)
            
            log(f"Processed {end}/{total_rows} rows...")

        log(f"Import complete. Processed: {count}, Created: {created_count}, Updated: {updated_count}", self.style.SUCCESS)
