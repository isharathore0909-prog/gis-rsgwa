import pandas as pd
from django.core.management.base import BaseCommand
from locationApi.models import Country, State, District, Block, Village
from rainfallApi.models import Rainfall
import datetime
import os

class Command(BaseCommand):
    help = 'Load rainfall data from Excel file'

    def handle(self, *args, **kwargs):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\BACK_END\Rainfall.xlsx'
        log_file = 'import_log.txt'
        
        with open(log_file, 'w') as f:
            f.write("Starting import...\n")

        if not os.path.exists(file_path):
            with open(log_file, 'a') as f:
                f.write(f"File not found: {file_path}\n")
            return

        try:
            df = pd.read_excel(file_path)
            with open(log_file, 'a') as f:
                f.write(f"Columns: {df.columns.tolist()}\n")
        except Exception as e:
            with open(log_file, 'a') as f:
                f.write(f"Error reading excel: {e}\n")
            return

        # Ensure base location exists
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        # Normalizing column names to lower case for easier matching
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Mappings
        col_district = next((c for c in df.columns if 'district' in c), None)
        col_block = next((c for c in df.columns if 'block' in c), None)
        col_village = next((c for c in df.columns if 'village' in c or 'location' in c), None)
        col_rainfall = next((c for c in df.columns if 'rain' in c), None)
        col_date = next((c for c in df.columns if 'date' in c), 'date') # default to 'date'

        with open(log_file, 'a') as f:
            f.write(f"Mapped Columns: District={col_district}, Block={col_block}, Village={col_village}, Rainfall={col_rainfall}, Date={col_date}\n")

        if not all([col_district, col_block, col_village, col_rainfall]):
             with open(log_file, 'a') as f:
                f.write("Critical columns missing. Aborting.\n")
             return

        count = 0
        for index, row in df.iterrows():
            try:
                district_name = row[col_district]
                block_name = row[col_block]
                village_name = row[col_village]
                rainfall_val = row[col_rainfall]
                date_val = row.get(col_date) 

                # If date is missing, maybe it's in the filename or fixed? 
                # For now assume it's in the row or default to today if missing (bad practice but keeps it running)
                if pd.isna(date_val):
                    date_val = datetime.date.today()
                
                if pd.isna(district_name) or pd.isna(block_name) or pd.isna(village_name):
                    continue

                # Ensure Hierarchy
                district, _ = District.objects.get_or_create(name=district_name, state=state)
                block, _ = Block.objects.get_or_create(name=block_name, district=district)
                village, _ = Village.objects.get_or_create(name=village_name, block=block)

                # Parse Date
                date_obj = date_val
                if isinstance(date_val, str):
                    try:
                        date_obj = datetime.datetime.strptime(date_val, '%Y-%m-%d').date()
                    except:
                        pass # Keep as is or fail

                if isinstance(date_obj, datetime.datetime):
                    date_obj = date_obj.date()

                # Create Rainfall Record
                Rainfall.objects.update_or_create(
                    village=village,
                    date=date_obj,
                    gauge_type='manual',
                    defaults={'rainfall_mm': rainfall_val if not pd.isna(rainfall_val) else 0.0}
                )
                count += 1
            except Exception as e:
                 with open(log_file, 'a') as f:
                    f.write(f"Row {index} error: {e}\n")

        with open(log_file, 'a') as f:
            f.write(f"Successfully processed {count} rows.\n")
