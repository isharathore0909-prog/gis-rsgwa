
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from layersApi.models import SpatialLayer
from locationApi.models import District

def check_srids():
    print("Checking SRIDs...")
    
    # Check District
    dist = District.objects.exclude(geometry__isnull=True).first()
    if dist:
        print(f"District SRID (defined): {District._meta.get_field('geometry').srid}")
        print(f"District SRID (actual):  {dist.geometry.srid}")
        print(f"District Sample Area:    {dist.geometry.area}")
    
    # Check SpatialLayer
    layer = SpatialLayer.objects.filter(layer_type='aquifer').first()
    if layer:
        print(f"SpatialLayer SRID (defined): {SpatialLayer._meta.get_field('geometry').srid}")
        print(f"SpatialLayer SRID (actual):  {layer.geometry.srid}")
        print(f"SpatialLayer Sample Area:    {layer.geometry.area}")

if __name__ == "__main__":
    check_srids()
