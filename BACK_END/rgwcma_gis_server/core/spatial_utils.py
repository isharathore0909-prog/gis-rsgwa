from django.contrib.gis.db.models.functions import AsGeoJSON, Transform
from locationApi.models import Grampanchayat, District, Block
import json

def get_map_scope(request, gp_id=None, block_id=None, district_id=None):
    """
    Returns boundary data and bounding box for a given location level.
    Used for contour map calculation and clipping.
    """
    try:
        obj = None
        if gp_id:
            obj = Grampanchayat.objects.get(id=gp_id)
        elif block_id:
            obj = Block.objects.get(id=block_id)
        elif district_id:
            obj = District.objects.get(id=district_id)
            
        if not obj or not obj.geometry:
            return None, None, None, None

        geom = obj.geometry
        # Check if coordinates are in Web Mercator (EPSG:3857) or UTM Zone 43N (EPSG:32643)
        ext = geom.extent
        
        # ext[0] is the minimum X coordinate (Longitude or Easting)
        if ext[0] > 2000000:
            # Huge values > 2 million are Web Mercator (3857)
            geom.srid = 3857
            geom.transform(4326)
            print(f"[FIX] Fixed geometry for {obj.name}: Transformed from 3857 to 4326")
        elif ext[0] > 200:
            # Values in the hundreds of thousands are UTM Zone 43N (32643)
            geom.srid = 32643
            geom.transform(4326)
            print(f"[FIX] Fixed geometry for {obj.name}: Transformed from 32643 to 4326")

        # 1. Boundary Data (GeoJSON)
        boundary_data = json.loads(geom.geojson)
        
        # 2. Coordinates (Extent)
        # extent returns (xmin, ymin, xmax, ymax)
        bbox_vals = geom.extent
        
        # 3. Formatted BBox string
        bbox_str = f"{bbox_vals[0]},{bbox_vals[1]},{bbox_vals[2]},{bbox_vals[3]}"
        
        return boundary_data, None, bbox_str, bbox_vals

    except (Grampanchayat.DoesNotExist, Block.DoesNotExist, District.DoesNotExist):
        return None, None, None, None
    except Exception as e:
        print(f"Error in get_map_scope: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None, None
