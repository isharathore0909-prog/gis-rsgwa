# -*- coding: utf-8 -*-
"""
Management command to load location codes from CSV and fetch boundaries
"""

from django.core.management.base import BaseCommand
from locationApi.models import LocationCode, District, Block, Grampanchayat, Village
from locationApi.views import BoundaryByCodeView
import pandas as pd
import os

class Command(BaseCommand):
    help = 'Load location codes from CSV file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-path',
            type=str,
            default=r'D:\GIS_RSGWA_ANALYSIS\df_vgbd_updated_with_gp_code.csv',
            help='Path to CSV file with location codes'
        )
        parser.add_argument(
            '--fetch-boundaries',
            action='store_true',
            help='Fetch boundaries after loading codes'
        )

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f'CSV file not found: {csv_path}'))
            return
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('LOADING LOCATION CODES FROM CSV'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        # Load CSV
        self.stdout.write(f'\nReading CSV from: {csv_path}')
        df = pd.read_csv(csv_path)
        
        self.stdout.write(f'Found {len(df)} rows in CSV')
        self.stdout.write(f'Columns: {list(df.columns)}')
        
        # Clear existing data
        old_count = LocationCode.objects.count()
        LocationCode.objects.all().delete()
        self.stdout.write(f'\nDeleted {old_count} existing LocationCode entries')
        
        # Load data
        self.stdout.write('\nLoading data...')
        created_count = 0
        
        for idx, row in df.iterrows():
            try:
                LocationCode.objects.create(
                    dist_name=str(row.get('DISTRICT_NAME', row.get('district_name', ''))).strip(),
                    dist_code=str(row.get('DISTRICT_CODE', row.get('district_code', ''))).strip(),
                    block_name=str(row.get('BLOCK_NAME', row.get('block_name', ''))).strip(),
                    block_code=str(row.get('BLOCK_CODE', row.get('block_code', ''))).strip(),
                    gp_name=str(row.get('GP_NAME', row.get('gp_name', ''))).strip(),
                    gp_code=str(row.get('GP_CODE', row.get('gp_code', ''))).strip(),
                    vlg_name=str(row.get('VILLAGE_NAME', row.get('village_name', row.get('vlg_name', '')))).strip(),
                    vlg_code=str(row.get('VILLAGE_CODE', row.get('village_code', row.get('vlg_code', '')))).strip()
                )
                created_count += 1
                
                if (idx + 1) % 1000 == 0:
                    self.stdout.write(f'  Loaded {idx + 1} rows...')
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Error on row {idx}: {e}'))
        
        total = LocationCode.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully loaded {total} location codes'))
        
        # Show sample data
        self.stdout.write('\nSample district codes:')
        districts = LocationCode.objects.values('dist_name', 'dist_code').distinct()[:10]
        for d in districts:
            self.stdout.write(f"  {d['dist_name']}: {d['dist_code']}")
        
        # Fetch boundaries if requested
        if options['fetch_boundaries']:
            self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
            self.stdout.write(self.style.SUCCESS('FETCHING DISTRICT BOUNDARIES'))
            self.stdout.write(self.style.SUCCESS('=' * 60))
            
            self.fetch_district_boundaries()
    
    def fetch_district_boundaries(self):
        """Fetch boundaries for all districts"""
        districts = District.objects.all()
        total = districts.count()
        
        self.stdout.write(f'\nFound {total} districts in database')
        
        success = 0
        failed = 0
        skipped = 0
        
        for idx, district in enumerate(districts, 1):
            self.stdout.write(f'\n[{idx}/{total}] {district.name}')
            
            if district.boundary:
                self.stdout.write(self.style.WARNING('  → Already has boundary, skipping'))
                skipped += 1
                continue
            
            # Find code in LocationCode table
            loc_code = LocationCode.objects.filter(dist_name__iexact=district.name).first()
            
            if not loc_code:
                self.stdout.write(self.style.ERROR(f'  → No code found'))
                failed += 1
                continue
            
            code = loc_code.dist_code
            self.stdout.write(f'  → Code: {code}')
            
            # Fetch boundary
            self.stdout.write(f'  → Fetching from external API...')
            boundary = BoundaryByCodeView.fetch_external_boundary('district', code)
            
            if boundary:
                district.boundary = boundary
                district.code = code
                district.save()
                self.stdout.write(self.style.SUCCESS(f'  → ✓ SUCCESS'))
                success += 1
            else:
                self.stdout.write(self.style.ERROR(f'  → ✗ FAILED'))
                failed += 1
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'\nTotal: {total}')
        self.stdout.write(self.style.SUCCESS(f'Success: {success}'))
        self.stdout.write(self.style.WARNING(f'Skipped: {skipped}'))
        self.stdout.write(self.style.ERROR(f'Failed: {failed}'))
