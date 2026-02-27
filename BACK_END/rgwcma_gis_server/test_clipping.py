
import os
import django
import json

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from layersApi.models import SpatialLayer
from locationApi.models import District
from django.contrib.gis.db.models.functions import Intersection
from django.db.models import Q

def test_clipping(district_name, layer_type='aquifer'):
    print(f"Testing clipping for District: {district_name}, Layer: {layer_type}")
    
    # 1. Get Boundary
    dist = District.objects.filter(name__iexact=district_name).exclude(geometry__isnull=True).first()
    if not dist:
        print(f"ERROR: No geometry found for district {district_name}")
        return
    
    boundary_geom = dist.geometry
    print(f"Boundary found. Area: {boundary_geom.area}")
    
    # 2. Query Layer
    qs = SpatialLayer.objects.filter(layer_type=layer_type)
    intersecting_count = qs.filter(geometry__intersects=boundary_geom).count()
    print(f"Number of features intersecting with boundary: {intersecting_count}")
    
    if intersecting_count == 0:
        print("No spatial intersection found. Falling back to property filter...")
        qs_prop = qs.filter(
            Q(properties__District__iexact=district_name) |
            Q(properties__DISTRICT__iexact=district_name) |
            Q(properties__New_Dist__iexact=district_name)
        )
        print(f"Number of features matching property filter: {qs_prop.count()}")
        return

    # 3. Perform Intersection
    clipped_qs = qs.filter(geometry__intersects=boundary_geom).annotate(
        clipped_geom=Intersection('geometry', boundary_geom)
    )
    
    print("\nResults:")
    for obj in clipped_qs[:5]:
        orig_area = obj.geometry.area
        clip_area = obj.clipped_geom.area
        print(f"ID: {obj.id}, Name: {obj.name}")
        print(f"  - Original Area: {orig_area}")
        print(f"  - Clipped Area:  {clip_area}")
        print(f"  - Same? {orig_area == clip_area}")

if __name__ == "__main__":
    test_clipping("Alwar")
    test_clipping("Bikaner")
