import json
import os
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from django.db import transaction
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Import groundwater zones from a GeoJSON file'

    def add_arguments(self, parser):
        parser.add_argument('geojson_path', type=str, help='Path to the GeoJSON file')

    def handle(self, *args, **options):
        geojson_path = options['geojson_path']
        
        if not os.path.exists(geojson_path):
            self.stderr.write(self.style.ERROR(f"File not found: {geojson_path}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Reading {geojson_path}..."))
        
        try:
            with open(geojson_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to read JSON: {e}"))
            return

        features = data.get('features', [])
        if not features:
            self.stderr.write(self.style.WARNING("No features found in GeoJSON"))
            return

        self.stdout.write(self.style.SUCCESS(f"Found {len(features)} features. Starting import..."))

        try:
            with transaction.atomic():
                # Clear existing groundwater zones
                deleted_count = SpatialLayer.objects.filter(layer_type='groundwater_zone').delete()[0]
                self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} old records"))

                layers_to_create = []
                for feature in features:
                    geom_data = feature.get('geometry')
                    if not geom_data:
                        continue
                    
                    properties = feature.get('properties', {})
                    
                    # Try to find a name in common GeoJSON fields
                    name = properties.get('block', properties.get('BLOCK', properties.get('name', properties.get('NAME'))))
                    
                    try:
                        geometry = GEOSGeometry(json.dumps(geom_data))
                        # Ensure SRID is 4326
                        if not geometry.srid:
                            geometry.srid = 4326
                            
                        layers_to_create.append(SpatialLayer(
                            name=name,
                            layer_type='groundwater_zone',
                            properties=properties,
                            geometry=geometry
                        ))
                    except Exception as geom_error:
                        self.stderr.write(self.style.WARNING(f"Skipping invalid geometry for {name}: {geom_error}"))

                # Bulk create for performance
                SpatialLayer.objects.bulk_create(layers_to_create)
                self.stdout.write(self.style.SUCCESS(f"Successfully imported {len(layers_to_create)} groundwater zones"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Import failed: {e}"))
