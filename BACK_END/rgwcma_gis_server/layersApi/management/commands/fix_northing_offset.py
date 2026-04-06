
import json
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Correct Northing offset and transform to WGS84'

    def handle(self, *args, **options):
        queryset = SpatialLayer.objects.filter(layer_type='groundwater_zone')
        total = queryset.count()
        self.stdout.write(f"Processing {total} features...")

        updated_count = 0
        for obj in queryset:
            geom = obj.geometry
            # Force transform back to 32643 (UTM Zone 43N)
            geom.transform(32643)
            
            def add_offset(coords):
                if isinstance(coords[0], (int, float)):
                    return [coords[0], coords[1] + 2500000]
                return [add_offset(c) for c in coords]

            geojson = json.loads(geom.geojson)
            geojson['coordinates'] = add_offset(geojson['coordinates'])
            
            # Create a NEW geometry object from the shifted coordinates
            # and explicitly state it's 32643
            wkt = GEOSGeometry(json.dumps(geojson)).wkt
            new_geom = GEOSGeometry(wkt, srid=32643)
            new_geom.transform(4326)
            
            obj.geometry = new_geom
            obj.save()
            updated_count += 1
            if updated_count % 50 == 0:
                self.stdout.write(f"Updated {updated_count}...")

        self.stdout.write(self.style.SUCCESS(f"Finished. Updated {updated_count} records with 2.5M Northing offset."))
