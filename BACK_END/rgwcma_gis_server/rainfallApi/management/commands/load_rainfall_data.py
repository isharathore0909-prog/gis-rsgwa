import pandas as pd
from django.core.management.base import BaseCommand
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
            # Print to stdout
            if style:
                self.stdout.write(style(msg))
            else:
                self.stdout.write(msg)
            # Write to file
            try:
                with open(log_file, 'a') as f:
                    f.write(msg + '\n')
            except:
                pass

        # Clear log file
        with open(log_file, 'w') as f:
            f.write("Starting import...\n")
        
        log("Starting import...")

        if not os.path.exists(file_path):
            log(f"File not found: {file_path}", self.style.ERROR)
            return

        try:
            log(f"Reading file (first 1000 rows): {file_path}")
            df = pd.read_excel(file_path, nrows=1000)
            log(f"Columns found: {df.columns.tolist()}")
            if not df.empty:
                log(f"First row: {df.iloc[0].to_dict()}")
            else:
                log("Excel file is empty.", self.style.WARNING)
                return
        except Exception as e:
            log(f"Error reading excel: {e}", self.style.ERROR)
            return

        try:
             # Ensure base location exists
            country, _ = Country.objects.get_or_create(name='India')
            state, _ = State.objects.get_or_create(name='Rajasthan', country=country)
            log("Base locations (India, Rajasthan) checked/created.")
        except Exception as e:
            log(f"Database Error during initialization: {e}", self.style.ERROR)
            return

        # Normalizing column names to lower case for easier matching
        original_columns = df.columns.tolist()
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Mappings based on provided Excel snippet
        col_district = next((c for c in df.columns if 'district' in c), None)
        col_block = next((c for c in df.columns if 'block' in c), None)
        col_grampanchayat = next((c for c in df.columns if 'grampanch' in c or 'gp' in c), None)
        col_village = next((c for c in df.columns if 'village' in c or 'location' in c or 'station' in c), None)
        col_rainfall = next((c for c in df.columns if 'rainfall(in mm)' in c or 'rain(mm)' in c or 'rainfall' in c), None)
        col_date = next((c for c in df.columns if 'rainfall date' in c or 'date' in c), None)
        col_gauge_type = next((c for c in df.columns if 'type of rain gauge' in c or 'gauge' in c), None)
        
        log(f"Mapped Columns: District='{col_district}', Block='{col_block}', GP='{col_grampanchayat}', Village='{col_village}', Rainfall='{col_rainfall}', Date='{col_date}', GaugeType='{col_gauge_type}'")

        if not all([col_district, col_block, col_village, col_rainfall]):
             log("Critical columns missing. Aborting.", self.style.ERROR)
             log(f"Available columns (normalized): {df.columns.tolist()}")
             return

        # If date column is missing, check if we need to infer it or if it's a critical error
        if not col_date:
            log("Date column not found. Records will be skipped or need defaults.", self.style.WARNING)

        count = 0
        created_count = 0
        updated_count = 0
        
        # We can use update_or_create or get_or_create. 
        # For performance, we might want to cache some objects, but let's keep it robust first.
        
        for index, row in df.iterrows():
            try:
                district_name = row[col_district]
                block_name = row[col_block]
                gp_name = row.get(col_grampanchayat)
                village_name = row[col_village]
                rainfall_val = row[col_rainfall]
                gauge_type_val = row.get(col_gauge_type, 'manual')
                
                if col_date:
                    date_val = row[col_date]
                else:
                    date_val = datetime.date.today()

                if pd.isna(district_name) or pd.isna(block_name) or pd.isna(village_name):
                    continue

                # Clean names (removing suffixes like _112 if present, or keeping as is if required)
                # The Excel snippet shows 'Rajsamand_112', 'Rajsamand_767', 'Tasol_41321'
                # User usually wants the clean name, but the codes might be important.
                # For now, let's keep them as is unless told otherwise, but trim whitespace.
                district_name = str(district_name).strip()
                block_name = str(block_name).strip()
                gp_name = str(gp_name).strip() if not pd.isna(gp_name) else "Unknown"
                village_name = str(village_name).strip()
                
                # Ensure Hierarchy
                district, _ = District.objects.get_or_create(name=district_name, state=state)
                block, _ = Block.objects.get_or_create(name=block_name, district=district)
                grampanchayat, _ = Grampanchayat.objects.get_or_create(name=gp_name, block=block)
                village, _ = Village.objects.get_or_create(name=village_name, grampanchayat=grampanchayat)

                # Parse Date
                date_obj = date_val
                if isinstance(date_val, str):
                    parsed = False
                    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d', '%Y%m%d', '%Y-%m-%d %H:%M:%S'):
                         try:
                             date_obj = datetime.datetime.strptime(date_val, fmt).date()
                             parsed = True
                             break
                         except ValueError:
                             pass
                    if not parsed:
                        date_obj = datetime.date.today()
                elif isinstance(date_val, (datetime.datetime, pd.Timestamp)):
                    date_obj = date_val.date()
                elif not isinstance(date_val, datetime.date):
                     date_obj = datetime.date.today()

                # Parse Rainfall
                try:
                    rainfall_float = float(rainfall_val)
                except (ValueError, TypeError):
                    rainfall_float = 0.0

                # Normalize Gauge Type
                gauge_type = str(gauge_type_val).lower()
                if 'manual' in gauge_type:
                    gauge_type = 'manual'
                elif 'auto' in gauge_type:
                    gauge_type = 'automatic'
                elif 'tele' in gauge_type:
                    gauge_type = 'telemetric'
                else:
                    gauge_type = 'manual'

                # Create/Update Rainfall Record
                obj, created = Rainfall.objects.update_or_create(
                    village=village,
                    date=date_obj,
                    gauge_type=gauge_type,
                    defaults={'rainfall_mm': rainfall_float}
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
                count += 1
                
                if count % 100 == 0:
                    log(f"Processed {count} rows...")

            except Exception as e:
                 log(f"Row {index} error: {e}", self.style.ERROR)

        log(f"Successfully processed {count} rows. Created: {created_count}, Updated: {updated_count}.", self.style.SUCCESS)
