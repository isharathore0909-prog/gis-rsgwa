import json
import logging
from typing import Optional, Dict, Any
from django.db import connection
from django.contrib.gis.geos import GEOSGeometry
from django.core.cache import cache
from rest_framework import viewsets, permissions
from rest_framework.permissions import AllowAny
from django.db.models import QuerySet
from rest_framework.response import Response

from ..models import Country, State, District, Block, Grampanchayat, Village

logger = logging.getLogger(__name__)

GPSPL_DOMAIN = "http://gpspl.geoplanetsolution.in"
DEFAULT_EXTERNAL_API_KEY = "e32ebc1d-fe04-4bd7-9003-df5274c990e2"

LAYER_PARENT_MAP = {
    'state': 'country_id',
    'district': 'state_id',
    'block': 'district_id',
    'gp': 'block_id',
    'village': 'grampanchayat_id'
}

LOCATION_CODE_FIELD_MAP = {
    'block': ('block_name', 'block_code'),
    'gp': ('gp_name', 'gp_code'),
    'village': ('vlg_name', 'vlg_code')
}

def ensure_wgs84(geom: Any) -> Any:
    if not geom or not isinstance(geom, dict):
        return geom

    def swap_recursive(obj):
        if isinstance(obj, list) and len(obj) >= 2 and isinstance(obj[0], (int, float)):
            return [obj[1], obj[0]] + obj[2:]
        if isinstance(obj, list):
            return [swap_recursive(item) for item in obj]
        return obj

    try:
        coords = []
        g_type = geom.get('type')
        if g_type == 'Point':
            coords = [geom.get('coordinates')]
        elif g_type in ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']:
            p = geom.get('coordinates')
            while p and isinstance(p, list) and len(p) > 0 and isinstance(p[0], list):
                p = p[0]
            if p and isinstance(p, list) and len(p) >= 2:
                coords = [p]

        for c in coords:
            if not c or len(c) < 2: continue
            x, y = float(c[0]), float(c[1])
            # Rajasthan Lat: ~23-31, Lon: ~69-78
            # Standard GeoJSON is [Lon, Lat]
            # If x falls in Lat range and y in Lon range, it's likely swapped
            if (20.0 < x < 35.0) and (65.0 < y < 85.0):
                geom = swap_recursive(geom)
                x, y = y, x
                swapped = True
            if abs(x) > 180 or abs(y) > 90:
                try:
                    g = GEOSGeometry(json.dumps(geom))
                    if 2000000 < abs(y) < 4000000:
                        g.srid = 32643 if abs(x) < 1000000 else 3857
                    else:
                        g.srid = 3857
                    g.transform(4326)
                    return json.loads(g.geojson)
                except Exception as ex:
                    logger.warning(f"Spatial fix-up failed: {ex}")
            if swapped: return geom
    except Exception as e:
        logger.debug(f"ensure_wgs84 heuristic skipped: {e}")
    return geom

def get_address_from_lat_lon(lat: float, lon: float) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
    cache_key = f"reverse_geo_{round(lat, 4)}_{round(lon, 4)}"
    cached_address = cache.get(cache_key)
    if cached_address:
        return cached_address, cached_address.get('vllg_code')

    query = f"""
        SELECT 
            v.name, v.code, g.name, g.code, b.name, b.code, d.name, d.code
        FROM {Village._meta.db_table} v
        JOIN {Grampanchayat._meta.db_table} g ON v.grampanchayat_id = g.id
        JOIN {Block._meta.db_table} b ON g.block_id = b.id
        JOIN {District._meta.db_table} d ON b.district_id = d.id
        WHERE v.latitude IS NOT NULL AND v.longitude IS NOT NULL
        ORDER BY ((v.latitude - %s) * (v.latitude - %s) + (v.longitude - %s) * (v.longitude - %s)) ASC
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(query, [lat, lat, lon, lon])
        row = cursor.fetchone()
        if row:
            address = {
                "vllg_name": row[0], "vllg_code": row[1],
                "gp_name": row[2], "gp_code": row[3],
                "block_name": row[4], "block_code": row[5],
                "dist_name": row[6], "dist_code": row[7],
                "state_name": "Rajasthan",
            }
            cache.set(cache_key, address, 3600 * 24)
            return address, row[1]
    return None, None

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or (request.user and request.user.is_staff)

class BaseLocationViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__iexact=name)
        return queryset

    def list(self, request, *args, **kwargs):
        from core.services.cache_utils import build_cache_key
        # Different cache key for each model and filter combination
        cache_key = build_cache_key(f"loc_{self.__class__.__name__.lower()}", request)
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)
            
        response = super().list(request, *args, **kwargs)
        # Cache for 1 hour as location data is nearly static
        cache.set(cache_key, response.data, 3600)
        return response
