
from django.core.management.base import BaseCommand
from locationApi.models import District
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Diagnostic for spatial intersection'

    def handle(self, *args, **options):
        dist = District.objects.filter(name__iexact='AJMER').first()
        if not dist or not dist.geometry:
            self.stdout.write("AJMER district not found or has no geometry")
            return
            
        self.stdout.write(f"AJMER District Geometry SRID: {dist.geometry.srid}")
        self.stdout.write(f"AJMER District Centroid: {dist.geometry.centroid.x}, {dist.geometry.centroid.y}")
        
        gwre_sample = SpatialLayer.objects.filter(layer_type='groundwater_zone', properties__DISTRICT_N__iexact='AJMER').first()
        if gwre_sample:
            self.stdout.write(f"GWRE Sample SRID: {gwre_sample.geometry.srid}")
            self.stdout.write(f"GWRE Sample Centroid: {gwre_sample.geometry.centroid.x}, {gwre_sample.geometry.centroid.y}")
            
            intersects = gwre_sample.geometry.intersects(dist.geometry)
            self.stdout.write(f"Direct HEOS Intersects check: {intersects}")
        else:
            self.stdout.write("No GWRE sample found for AJMER")
