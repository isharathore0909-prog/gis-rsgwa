# -*- coding: utf-8 -*-
"""
Django management command to fetch and populate district boundaries
"""

from django.core.management.base import BaseCommand
from locationApi.models import District, LocationCode, State
from locationApi.views import BoundaryByCodeView
import sys

class Command(BaseCommand):
    help = 'Fetch and populate district boundaries from external API using location_code_api'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of districts to process'
        )

    def handle(self, *args, **options):
        limit = options.get('limit')
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('FETCHING DISTRICT BOUNDARIES'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        # Get all districts
        districts = District.objects.all()
        if limit:
            districts = districts[:limit]
        
        total = districts.count()
        self.stdout.write(f"\nFound {total} districts to process\n")
        
        success_count = 0
        error_count = 0
        skip_count = 0
        
        for idx, district in enumerate(districts, 1):
            self.stdout.write(f"\n[{idx}/{total}] Processing: {district.name}")
            
            # Check if boundary already exists
            if district.boundary:
                self.stdout.write(self.style.WARNING(f"  -> Already has boundary, skipping"))
                skip_count += 1
                continue
            
            # Get code from LocationCode table
            loc_code = LocationCode.objects.filter(dist_name__iexact=district.name).first()
            
            if not loc_code:
                self.stdout.write(self.style.ERROR(f"  -> No code found in location_code_api"))
                error_count += 1
                continue
            
            code = loc_code.dist_code
            self.stdout.write(f"  -> Found code: {code}")
            
            # Fetch boundary from external API
            self.stdout.write(f"  -> Fetching from external API...")
            boundary = BoundaryByCodeView.fetch_external_boundary('district', code)
            
            if boundary:
                # Save to database
                district.boundary = boundary
                if not district.code or len(str(district.code)) < 2:
                    district.code = code
                district.save()
                
                self.stdout.write(self.style.SUCCESS(f"  -> SUCCESS! Boundary saved"))
                success_count += 1
            else:
                self.stdout.write(self.style.ERROR(f"  -> FAILED to fetch boundary"))
                error_count += 1
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f"\nTotal Districts: {total}")
        self.stdout.write(self.style.SUCCESS(f"Successfully Fetched: {success_count}"))
        self.stdout.write(self.style.WARNING(f"Skipped (already had boundary): {skip_count}"))
        self.stdout.write(self.style.ERROR(f"Errors: {error_count}"))
        self.stdout.write('')
