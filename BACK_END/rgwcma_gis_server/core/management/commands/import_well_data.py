import os
import pandas as pd
from django.core.management.base import BaseCommand
from aquiferApi.models import AquiferData
from locationApi.models import Village, Grampanchayat, Block, District, State, Country

class Command(BaseCommand):
    help = 'Imports well water level data from an Excel file.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the well data Excel file')

    def handle(self, *args, **options):
        file_path = options['file_path']

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        self.stdout.write(f"Reading Excel file: {file_path}")
        df = pd.read_excel(file_path)
        
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)
        
        dist_cache = {}
        block_cache = {}
        gp_cache = {}
        village_cache = {}

        total_rows = len(df)
        imported = 0
        errors = 0

        for index, row in df.iterrows():
            try:
                dist_name = str(row['district']).strip()
                block_name = str(row['block']).strip()
                gp_name = str(row['grampanchayat']).strip()
                village_name = str(row['Village']).strip()
                
                if dist_name not in dist_cache:
                    dist_cache[dist_name], _ = District.objects.get_or_create(name=dist_name, state=state)
                district = dist_cache[dist_name]
                
                block_key = (dist_name, block_name)
                if block_key not in block_cache:
                    block_cache[block_key], _ = Block.objects.get_or_create(name=block_name, district=district)
                block = block_cache[block_key]
                
                gp_key = (block_key, gp_name)
                if gp_key not in gp_cache:
                    gp_cache[gp_key], _ = Grampanchayat.objects.get_or_create(name=gp_name, block=block)
                gp = gp_cache[gp_key]
                
                v_key = (gp_key, village_name)
                if v_key not in village_cache:
                    village_cache[v_key], _ = Village.objects.get_or_create(name=village_name, grampanchayat=gp)
                village = village_cache[v_key]
                
                well_id = str(row['Well_ID']).strip()
                
                data_fields = {}
                for year in range(2015, 2025):
                    pre_col = f'Pre_{year}'
                    pst_col = f'Pst_{year}' if year < 2022 else f'Post_{year}'
                    
                    pre_val = row.get(pre_col)
                    pst_val = row.get(pst_col)
                    
                    def safe_float(val):
                        if pd.isnull(val): return None
                        try:
                            return float(val)
                        except (ValueError, TypeError):
                            return None

                    data_fields[f'pre_{year}'] = safe_float(pre_val)
                    data_fields[f'pst_{year}'] = safe_float(pst_val)

                aquifer_obj, created = AquiferData.objects.update_or_create(
                    well_id=well_id,
                    defaults={
                        'village': village,
                        'latitude': float(row['Latitude']) if pd.notnull(row['Latitude']) else None,
                        'longitude': float(row['Longitude']) if pd.notnull(row['Longitude']) else None,
                        'well_depth': float(row['Well_Depth']) if pd.notnull(row['Well_Depth']) else None,
                        'aquifer': str(row['Aquifer']) if pd.notnull(row['Aquifer']) else None,
                        **data_fields
                    }
                )
                
                imported += 1
                if imported % 100 == 0:
                    self.stdout.write(f"Processed {imported}/{total_rows} rows...")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing row {index} (Well ID: {row.get('Well_ID')}): {e}"))
                errors += 1

        self.stdout.write(self.style.SUCCESS(f"\nMigration Completed!"))
        self.stdout.write(f"Total Rows processed: {total_rows}")
        self.stdout.write(f"Successfully Imported/Updated: {imported}")
        self.stdout.write(f"Errors: {errors}")
