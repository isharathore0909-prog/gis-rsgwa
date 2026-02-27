
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from layersApi.models import SpatialLayer
from locationApi.models import District
from django.contrib.gis.db.models.functions import Intersection

def test_clipping_fixed(district_name):
    print(f"Testing clipping (fixed logic) for District: {district_name}")
    
    dist = District.objects.filter(name__iexact=district_name).exclude(geometry__isnull=True).first()
    boundary_geom = dist.geometry
    
    # Check and transform if needed
    if abs(boundary_geom.centroid.x) > 180:
        print("Deteced 3857 mismatch. Transforming to 4326...")
        boundary_geom.srid = 3857
        boundary_geom.transform(4326)
    
    qs = SpatialLayer.objects.filter(layer_type='aquifer')
    intersecting_qs = qs.filter(geometry__intersects=boundary_geom).annotate(
        clipped_geom=Intersection('geometry', boundary_geom)
    )
    
    count = intersecting_qs.count()
    print(f"Found {count} intersecting features.")
    
    for obj in intersecting_qs[:3]:
        print(f"  - {obj.name}: orig_area={obj.geometry.area:.6f}, clip_area={obj.clipped_geom.area:.6f}")

if __name__ == "__main__":
    test_clipping_fixed("Alwar")
    test_clipping_fixed("Bikaner")
