
from django.core.management.base import BaseCommand
from django.contrib.gis.db.models.functions import Envelope
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Check bounds of groundwater_zone layer'

    def handle(self, *args, **options):
        queryset = SpatialLayer.objects.filter(layer_type='groundwater_zone')
        total = queryset.count()
        if total == 0:
            self.stdout.write("No features found")
            return
            
        from django.contrib.gis.geos import MultiPolygon
        all_geoms = [obj.geometry for obj in queryset if obj.geometry]
        
        # Calculate overall extent
        # extent returns (xmin, ymin, xmax, ymax)
        # We can just iterate or use a shortcut
        xmin, ymin = 180, 90
        xmax, ymax = -180, -90
        
        for g in all_geoms:
            ext = g.extent
            xmin = min(xmin, ext[0])
            ymin = min(ymin, ext[1])
            xmax = max(xmax, ext[2])
            ymax = max(ymax, ext[3])
            
        self.stdout.write(f"Total features: {total}")
        self.stdout.write(f"Overall Extent: [{xmin}, {ymin}, {xmax}, {ymax}]")
        
        # Check if any features are still near the equator (ocean)
        ocean_count = sum(1 for g in all_geoms if g.centroid.y < 10)
        self.stdout.write(f"Features near equator (ocean): {ocean_count}")
        rajasthan_count = sum(1 for g in all_geoms if 23 < g.centroid.y < 31)
        self.stdout.write(f"Features in Rajasthan latitude: {rajasthan_count}")
