import csv
import os
from django.core.management.base import BaseCommand
from locationApi.models import Country, State, District, Block, Grampanchayat, Village, LocationCode

class Command(BaseCommand):
    help = 'Load location data from CSV'

    def handle(self, *args, **kwargs):
        file_path = r'D:\GIS_RSGWA_ANALYSIS\df_vgbd_updated_with_gp_code.csv'
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        # Counters
        created_counts = {'lc': 0}

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                # Check for BOM if needed or strip whitespace from headers
                reader.fieldnames = [name.strip() for name in reader.fieldnames]
                
                # Validate headers
                required_cols = [
                    'DIST_NAME', 'DISTRICT_CODE', 'PS_NAME', 'BLOCK_CODE',
                    'GP_NAME', 'GP_CODE', 'VILLAGE_NM'
                ]
                
                # Check for GVIL_CODE variants
                gvil_key = None
                for k in reader.fieldnames:
                    # Clean the key to remove BOM or whitespace
                    clean_k = k.strip().replace('\ufeff', '') 
                    if 'GVIL_CODE' in clean_k:
                        gvil_key = k
                        break
                
                # Fallback: if not found by name, try looking at the last column if it looks like a code?
                # Or just print available keys to help debug if it fails again
                if not gvil_key:
                     self.stdout.write(self.style.ERROR(f"Missing column: GVIL_CODE. Available keys: {reader.fieldnames}"))
                     return

                missing_cols = [col for col in required_cols if col not in reader.fieldnames]
                if missing_cols:
                    self.stdout.write(self.style.ERROR(f"Missing columns: {missing_cols}"))
                    return

                batch_size = 1000
                batch = []

                for row in reader:
                    # Parse row data
                    d_name = row['DIST_NAME'].strip()
                    d_code = row['DISTRICT_CODE'].strip()
                    b_name = row['PS_NAME'].strip()
                    b_code = row['BLOCK_CODE'].strip()
                    g_name = row['GP_NAME'].strip()
                    g_code = row['GP_CODE'].strip()
                    v_name = row['VILLAGE_NM'].strip()
                    v_code = row[gvil_key].strip()

                    # Prepare LocationCode object
                    lc = LocationCode(
                        dist_name=d_name,
                        dist_code=d_code,
                        block_name=b_name,
                        block_code=b_code,
                        gp_name=g_name,
                        gp_code=g_code,
                        vlg_name=v_name,
                        vlg_code=v_code
                    )
                    batch.append(lc)

                    # Bulk create in batches for performance
                    if len(batch) >= batch_size:
                        LocationCode.objects.bulk_create(batch, ignore_conflicts=True) # ignore_conflicts skips duplicates based on unique vlg_code
                        created_counts['lc'] += len(batch)
                        
                        with open(r'D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\load_log.txt', 'a') as log:
                            log.write(f"Processed {created_counts['lc']} LocationCodes...\n")
                        
                        batch = []

                # Create remaining
                if batch:
                    LocationCode.objects.bulk_create(batch, ignore_conflicts=True)
                    created_counts['lc'] += len(batch)

            with open(r'D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\load_log.txt', 'a') as log:
                log.write(f"Successfully loaded data into LocationCode ONLY.\n")
                log.write(f"LocationCodes processed: {created_counts['lc']}\n")

        except Exception as e:
             with open(r'D:\GIS_RSGWA_ANALYSIS\BACK_END\rgwcma_gis_server\load_log.txt', 'a') as log:
                log.write(f"Error: {e}\n")
