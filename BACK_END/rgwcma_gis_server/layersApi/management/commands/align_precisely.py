
import json
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Apply final precision shift to align with properties.X/Y'

    def handle(self, *args, **options):
        # The average offset I calculated
        dx = -1.1404589016017943
        dy = -0.5335006172357984
        
        queryset = SpatialLayer.objects.filter(layer_type='groundwater_zone')
        total = queryset.count()
        self.stdout.write(f"Shifting {total} features by [{dx}, {dy}]...")

        updated_count = 0
        for obj in queryset:
            geom = obj.geometry # This is in WGS84 (4326)
            
            def shift_coords(coords):
                if isinstance(coords[0], (int, float)):
                    return [coords[0] + dx, coords[1] + dy]
                return [shift_coords(c) for c in coords]

            geojson = json.loads(geom.geojson)
            geojson['coordinates'] = shift_coords(geojson['coordinates'])
            
            # WGS84 to WGS84
            obj.geometry = GEOSGeometry(json.dumps(geojson), srid=4326)
            obj.save()
            updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"Finished. Precisely aligned {updated_count} records."))
