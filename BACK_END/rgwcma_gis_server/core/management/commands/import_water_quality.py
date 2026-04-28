import os
import pandas as pd
import hashlib
from django.core.management.base import BaseCommand
from water_qualityApi.models import WaterQuality
from locationApi.models import Village, Grampanchayat, Block, District, State, Country

def safe_float(val):
    if pd.isnull(val):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def normalize_well_type(raw):
    if pd.isnull(raw):
        return 'other'
    val = str(raw).strip().lower()
    if 'bore' in val:
        return 'bore_well'
    if 'dug' in val:
        return 'dug_well'
    if 'hand' in val or 'pump' in val:
        return 'hand_pump'
    if 'tube' in val:
        return 'tube_well'
    if 'open' in val:
        return 'open_well'
    return 'other'

def make_well_id(row):
    raw_well_id = row.get('Well ID')
    if pd.notnull(raw_well_id) and str(raw_well_id).strip():
        year = str(int(row.get('Year', 0)))
        return f"{str(raw_well_id).strip()}_{year}"
    
    parts = [
        str(row.get('District', '')).strip(),
        str(row.get('Block', '')).strip(),
        str(row.get('GP', '')).strip(),
        str(row.get('Village', '')).strip(),
        str(row.get('Site_Name', '')).strip(),
        str(int(row.get('Year', 0))),
    ]
    combined = '|'.join(parts)
    short_hash = hashlib.md5(combined.encode()).hexdigest()[:12].upper()
    return f"WQ-{short_hash}"

class Command(BaseCommand):
    help = 'Imports water quality data from an Excel file.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the water quality Excel file')
        parser.add_argument('--clear', action='store_true', help='Clear existing water quality records before import')

    def handle(self, *args, **options):
        file_path = options['file_path']
        clear_existing = options['clear']

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        self.stdout.write(f"Reading Excel file: {file_path}")
        df = pd.read_excel(file_path)
        self.stdout.write(f"Total rows in Excel: {len(df)}")

        if clear_existing:
            count = WaterQuality.objects.count()
            self.stdout.write(f"Clearing {count} existing records...")
            WaterQuality.objects.all().delete()
            self.stdout.write("Cleared.")

        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        dist_cache = {}
        block_cache = {}
        gp_cache = {}
        village_cache = {}

        total_rows = len(df)
        imported = 0
        updated = 0
        errors = 0

        for index, row in df.iterrows():
            try:
                dist_name = str(row.get('District', '')).strip() or 'Unknown'
                block_name = str(row.get('Block', '')).strip() or 'Unknown'
                gp_name = str(row.get('GP', '')).strip() if pd.notnull(row.get('GP')) else 'Unknown'
                village_name = str(row.get('Village', '')).strip() if pd.notnull(row.get('Village')) else 'Unknown'

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

                well_id = make_well_id(row)
                raw_year = row.get('Year')
                if pd.isnull(raw_year):
                    self.stdout.write(self.style.WARNING(f"  Row {index}: Missing Year, skipping."))
                    errors += 1
                    continue
                meta_date = pd.Timestamp(year=int(raw_year), month=1, day=1).date()

                type_of_well = normalize_well_type(row.get('Type of well'))

                defaults = {
                    'village': village,
                    'latitude': safe_float(row.get('Latitude')),
                    'longitude': safe_float(row.get('Longitude')),
                    'type_of_well': type_of_well,
                    'well_depth': safe_float(row.get('Well Depth')),
                    'ph': safe_float(row.get('pH')),
                    'ec': safe_float(row.get('EC')),
                    'tds': safe_float(row.get('TDS')),
                    'hardness': safe_float(row.get('Total Hardness')),
                    'alkalinity': safe_float(row.get('Bicarbonate')),
                    'fluoride': safe_float(row.get('Fluoride')),
                    'nitrate': safe_float(row.get('Nitrate')),
                }

                obj, created = WaterQuality.objects.update_or_create(
                    well_id=well_id,
                    meta_date=meta_date,
                    defaults=defaults,
                )

                if created: imported += 1
                else: updated += 1

                if (imported + updated) % 200 == 0:
                    self.stdout.write(f"  Processed {imported + updated}/{total_rows} rows...")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERROR at row {index} (Well: {row.get('Well ID')}, Village: {row.get('Village')}): {e}"))
                errors += 1

        self.stdout.write(self.style.SUCCESS(f"\n====== Import Complete ======"))
        self.stdout.write(f"Total rows processed: {total_rows}")
        self.stdout.write(f"Newly created      : {imported}")
        self.stdout.write(f"Updated            : {updated}")
        self.stdout.write(f"Errors / Skipped   : {errors}")
        self.stdout.write(f"Total in DB now    : {WaterQuality.objects.count()}")
