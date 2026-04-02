from django.contrib.gis.db.models.functions import AsGeoJSON, Transform
from locationApi.models import Grampanchayat, District, Block
import json
import logging

logger = logging.getLogger(__name__)


def normalize_geometry_crs(geom):
    """
    Ensure a GEOS geometry is in WGS-84 (EPSG:4326).

    Heuristic detection:
    - centroid.x > 180  → Web Mercator (EPSG:3857)  → transform to 4326
    - centroid.x > 90   → UTM Zone 43N (EPSG:32643) → transform to 4326

    Returns the geometry (possibly mutated in-place) or None if geom is falsy.
    """
    if not geom:
        return geom
    try:
        cx = geom.centroid.x
        if cx > 2_000_000:
            geom.srid = 3857
            geom.transform(4326)
            logger.debug("normalize_geometry_crs: 3857→4326 (cx=%.1f)", cx)
        elif cx > 200:
            geom.srid = 32643
            geom.transform(4326)
            logger.debug("normalize_geometry_crs: 32643→4326 (cx=%.1f)", cx)
    except Exception as exc:
        logger.warning("normalize_geometry_crs: could not normalize CRS – %s", exc)
    return geom


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

        geom = normalize_geometry_crs(obj.geometry)

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
        logger.error("Error in get_map_scope: %s", e, exc_info=True)
        return None, None, None, None
