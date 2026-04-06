
import json
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Correct UTM coordinates to WGS84 for groundwater_zone layer'

    def handle(self, *args, **options):
        queryset = SpatialLayer.objects.filter(layer_type='groundwater_zone')
        total = queryset.count()
        self.stdout.write(f"Processing {total} features...")

        updated_count = 0
        for obj in queryset:
            # Check a sample coordinate to see if it's UTM
            geojson = json.loads(obj.geometry.geojson)
            coords = geojson['coordinates']
            
            # Simple check for UTM (numbers > 100k)
            def is_utm(c):
                if isinstance(c[0], list): return is_utm(c[0])
                return abs(c[0]) > 10000 

            if is_utm(coords):
                # It's incorrectly marked as 4326 but is UTM Zone 43N (32643)
                # First, set SRID to 32643
                obj.geometry.srid = 32643
                # Then transform to 4326
                obj.geometry.transform(4326)
                obj.save()
                updated_count += 1
                if updated_count % 50 == 0:
                    self.stdout.write(f"Updated {updated_count}...")

        self.stdout.write(self.style.SUCCESS(f"Finished. Updated {updated_count} records."))
