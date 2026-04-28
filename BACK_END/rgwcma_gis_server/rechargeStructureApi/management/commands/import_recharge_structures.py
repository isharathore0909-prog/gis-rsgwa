import pandas as pd
import os
from django.core.management.base import BaseCommand
from locationApi.models import District, Block, Grampanchayat, Village, State
from rechargeStructureApi.models import RechargeStructure
from django.db import transaction

class Command(BaseCommand):
    help = 'Import recharge structures from Excel file'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=r'C:\Users\pc\Downloads\geotagging_npmu.xlsx', help='Path to the excel file')
        parser.add_argument('--dry-run', action='store_true', help='Do not save changes to the database')

    def normalize_name(self, name):
        if pd.isna(name) or not name:
            return None
        name = str(name).strip()
        if '_' in name:
            name = name.split('_')[0]
        return name.strip().upper()

    def handle(self, *args, **options):
        file_path = options['file']
        dry_run = options['dry_run']

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Reading file: {file_path}"))
        
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading Excel: {e}"))
            return

        stats = {
            'total': len(df),
            'success': 0,
            'ignored': 0,
            'errors': 0,
            'village_not_found': 0
        }

        # Cache for Village lookups to avoid redundant DB queries
        village_cache = {}

        for index, row in df.iterrows():
            if index % 100 == 0:
                self.stdout.write(f"Processing row {index}/{len(df)}... (Success: {stats['success']})")

            try:
                dist_name = self.normalize_name(row.get('District'))
                block_name = self.normalize_name(row.get('Block'))
                gp_name = self.normalize_name(row.get('Grampanchyat'))
                vlg_name = self.normalize_name(row.get('Village Name'))
                
                structure_type = row.get('Type of structure')
                other_type = row.get('Other Type of structure')
                storage_capacity = row.get('Storage Capacity (Ha m)')
                lat = row.get('Latitude')
                lon = row.get('Longitude')
                status_val = row.get('Status')

                if not vlg_name:
                    stats['ignored'] += 1
                    continue

                cache_key = (dist_name, block_name, gp_name, vlg_name)
                village = village_cache.get(cache_key)

                if village is None:
                    # Location Resolution
                    village = Village.objects.filter(
                        name__iexact=vlg_name,
                        grampanchayat__name__iexact=gp_name,
                        grampanchayat__block__name__iexact=block_name,
                        grampanchayat__block__district__name__iexact=dist_name
                    ).first()

                    if not village:
                        village = Village.objects.filter(
                            name__iexact=vlg_name,
                            grampanchayat__name__iexact=gp_name
                        ).first()
                    
                    if village:
                        village_cache[cache_key] = village

                if not village:
                    stats['village_not_found'] += 1
                    if index % 1000 == 0:
                        self.stdout.write(self.style.WARNING(f"Row {index}: Village '{vlg_name}' not found."))
                    continue

                # Data Cleaning
                try:
                    lat_val = float(lat) if not pd.isna(lat) else None
                    lon_val = float(lon) if not pd.isna(lon) else None
                    storage_val = float(storage_capacity) if not pd.isna(storage_capacity) else None
                except (ValueError, TypeError):
                    lat_val = None
                    lon_val = None
                    storage_val = None

                if not dry_run:
                    with transaction.atomic():
                        recharge_obj, created = RechargeStructure.objects.update_or_create(
                            village=village,
                            latitude=lat_val,
                            longitude=lon_val,
                            structure_type=str(structure_type)[:255] if not pd.isna(structure_type) else None,
                            defaults={
                                'other_recharge_structures': str(other_type)[:255] if not pd.isna(other_type) else None,
                                'storage_capacity': storage_val,
                                'status': str(status_val)[:50] if not pd.isna(status_val) else None
                            }
                        )
                        if created:
                            stats['success'] += 1
                        else:
                            stats['ignored'] += 1
                else:
                    stats['success'] += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing row {index}: {e}"))
                stats['errors'] += 1

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN completed."))

        self.stdout.write(self.style.SUCCESS(f"Migration Complete:"))
        self.stdout.write(f"Total rows: {stats['total']}")
        self.stdout.write(f"Successfully processed: {stats['success']}")
        self.stdout.write(f"Villages not found: {stats['village_not_found']}")
        self.stdout.write(f"Ignored/Duplicates: {stats['ignored']}")
        self.stdout.write(f"Errors: {stats['errors']}")
