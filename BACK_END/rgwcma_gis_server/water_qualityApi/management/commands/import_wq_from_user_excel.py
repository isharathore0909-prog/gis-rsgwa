import pandas as pd
import datetime
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from water_qualityApi.models import WaterQuality
from django.conf import settings

class Command(BaseCommand):
    help = 'Import water quality data from the user-provided Excel file with Calcium/Magnesium support'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Absolute path to the Excel file')

    def handle(self, *args, **options):
        file_path = options['file_path']
        
        if not os.path.exists(file_path):
            self.stderr.write(f"File not found: {file_path}")
            return

        self.stdout.write(f"Reading Excel file: {file_path}")
        try:
            df = pd.read_excel(file_path, engine='openpyxl')
            self.stdout.write(f"Read {len(df)} rows.")
        except Exception as e:
            self.stderr.write(f"Error reading Excel: {e}")
            return

        # Normalize column names to exact list for easier mapping
        # ['S. No.', 'State', 'District', 'Block', 'GP', 'Village', 'Site_Name', 'Type of well', 
        # 'Source', 'Well ID', 'Latitude', 'Longitude', 'Well Depth', 'Aquifier type/ formation', 
        # 'Year', 'pH', 'EC', 'TDS', 'Total Hardness', 'Calcium', 'Magnesium', 'Sodium', 
        # 'Potassium', 'Carbonate', 'Bicarbonate', 'Sulphate', 'Chloride', 'Fluoride', 'Nitrate']
        
        col_map = {c: c for c in df.columns}
        
        self.stdout.write("Preparing location hierarchy...")
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        # Batch process
        batch_size = 500
        total_created = 0
        total_updated = 0
        total_errors = 0

        for start in range(0, len(df), batch_size):
            end = min(start + batch_size, len(df))
            chunk = df.iloc[start:end]
            
            with transaction.atomic():
                for index, row in chunk.iterrows():
                    try:
                        # 1. Location hierarchy
                        d_name = str(row['District']).strip() if pd.notna(row['District']) else None
                        b_name = str(row['Block']).strip() if pd.notna(row['Block']) else "Unknown"
                        gp_name = str(row['GP']).strip() if pd.notna(row['GP']) else "Unknown"
                        v_name = str(row['Village']).strip() if pd.notna(row['Village']) else None
                        
                        if not d_name or not v_name:
                            continue

                        dist, _ = District.objects.get_or_create(name=d_name, state=state)
                        blk, _ = Block.objects.get_or_create(name=b_name, district=dist)
                        gp_obj, _ = Grampanchayat.objects.get_or_create(name=gp_name, block=blk)
                        
                        lat = float(row['Latitude']) if pd.notna(row['Latitude']) else None
                        lon = float(row['Longitude']) if pd.notna(row['Longitude']) else None

                        v_obj, _ = Village.objects.get_or_create(
                            name=v_name, 
                            grampanchayat=gp_obj,
                            defaults={'latitude': lat, 'longitude': lon}
                        )
                        
                        # 2. Parameters
                        year = int(row['Year']) if pd.notna(row['Year']) else 2024
                        meta_date = datetime.date(year, 1, 1)
                        
                        well_id_raw = row['Well ID']
                        if pd.isna(well_id_raw):
                            well_id = f"WQ_{d_name}_{b_name}_{v_name}_{year}".replace(" ", "_")
                        else:
                            well_id = str(well_id_raw).strip()

                        def get_val(key):
                            val = row.get(key)
                            if pd.notna(val):
                                try: return float(val)
                                except: return None
                            return None

                        # Update or Create
                        wq, created = WaterQuality.objects.update_or_create(
                            well_id=well_id,
                            meta_date=meta_date,
                            defaults={
                                'village': v_obj,
                                'latitude': lat,
                                'longitude': lon,
                                'site_name': str(row['Site_Name']) if pd.notna(row['Site_Name']) else None,
                                'type_of_well': str(row['Type of well']) if pd.notna(row['Type of well']) else 'bore_well',
                                'source': str(row['Source']) if pd.notna(row['Source']) else None,
                                'well_depth': get_val('Well Depth'),
                                'aquifer_type': str(row['Aquifier type/ formation']) if pd.notna(row['Aquifier type/ formation']) else None,
                                'ph': get_val('pH'),
                                'ec': get_val('EC'),
                                'tds': get_val('TDS'),
                                'hardness': get_val('Total Hardness'),
                                'calcium': get_val('Calcium'),
                                'magnesium': get_val('Magnesium'),
                                'sodium': get_val('Sodium'),
                                'potassium': get_val('Potassium'),
                                'carbonate': get_val('Carbonate'),
                                'bicarbonate': get_val('Bicarbonate'),
                                'sulphate': get_val('Sulphate'),
                                'chloride': get_val('Chloride'),
                                'fluoride': get_val('Fluoride'),
                                'nitrate': get_val('Nitrate'),
                            }
                        )

                        if created: total_created += 1
                        else: total_updated += 1

                    except Exception as e:
                        total_errors += 1
                        self.stderr.write(f"Error at index {index}: {e}")

            self.stdout.write(f"Processed {end}/{len(df)} records...")

        self.stdout.write(self.style.SUCCESS(f"Done! Created: {total_created}, Updated: {total_updated}, Errors: {total_errors}"))
