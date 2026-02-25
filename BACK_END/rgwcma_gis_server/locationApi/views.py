"""
Location API Views

This module provides API endpoints for hierarchical location data management.
It integrates local PostGIS/SQLite records with external high-resolution 
boundary providers (GPSPL) using a hybrid cache-aside pattern.
"""

import json
import logging
import re
import requests
from typing import Optional, Dict, Any, List, Union

from django.db import connection
from django.db.models import QuerySet, Func
from django.contrib.gis.db.models.functions import Transform, AsGeoJSON
from django.contrib.gis.geos import GEOSGeometry
from rest_framework import viewsets, permissions, status, generics
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Country, State, District, Block, Grampanchayat, Village, LocationCode
from .serializers import (
    CountrySerializer, StateSerializer, DistrictSerializer, BlockSerializer, 
    GPSerializer, VillageSerializer, LocationHierarchySerializer
)
from .authentication import ApiKeyAuthentication
from .permissions import HasValidApiKey

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

GPSPL_DOMAIN = "http://gpspl.geoplanetsolution.in"
DEFAULT_EXTERNAL_API_KEY = "e32ebc1d-fe04-4bd7-9003-df5274c990e2"

# Layer mapping for hierarchical parent lookups
LAYER_PARENT_MAP = {
    'state': 'country_id',
    'district': 'state_id',
    'block': 'district_id',
    'gp': 'block_id',
    'village': 'grampanchayat_id'
}

# Mapping fields for external API lookups from LocationCode table
LOCATION_CODE_FIELD_MAP = {
    'block': ('block_name', 'block_code'),
    'gp': ('gp_name', 'gp_code'),
    'village': ('vlg_name', 'vlg_code')
}

# =============================================================================
# SPATIAL UTILITIES
# =============================================================================

def ensure_wgs84(geom: Any) -> Any:
    """
    Heuristic utility to detect and fix coordinate system issues in GeoJSON/Geometry objects.
    Fixes:
    1. Flipped coordinates [Lat, Lon] -> [Lon, Lat]
    2. Projected coordinates (Meters) -> Degrees [forcing SRID 32643 or 3857]
    """
    if not geom or not isinstance(geom, dict):
        return geom

    try:
        # Extract a sample coordinate for heuristic check
        coords = []
        g_type = geom.get('type')
        if g_type == 'Point':
            coords = [geom.get('coordinates')]
        elif g_type in ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']:
            p = geom.get('coordinates')
            # Dig down to the first numerical coordinate pair
            while p and isinstance(p, list) and len(p) > 0 and isinstance(p[0], list):
                p = p[0]
            if p and isinstance(p, list) and len(p) >= 2:
                coords = [p]

        for c in coords:
            if not c or len(c) < 2: continue
            
            x, y = float(c[0]), float(c[1])
            swapped = False
            
            # --- 1. Flipped Coordinates Detection (India specific) ---
            # Rajasthan/India: Lon 68-98, Lat 8-38.
            # If x is 20-30 and y is 70-80, they are definitely flipped.
            if 15.0 < x < 40.0 and 65.0 < y < 100.0:
                def swap_recursive(obj):
                    if isinstance(obj, list) and len(obj) >= 2 and isinstance(obj[0], (int, float)):
                        return [obj[1], obj[0]] + obj[2:]
                    if isinstance(obj, list):
                        return [swap_recursive(item) for item in obj]
                    return obj
                geom = swap_recursive(geom)
                # Re-extract for meter check below
                x, y = y, x
                swapped = True

            # --- 2. Projected Coordinates Detection (Meters) ---
            # If values are in hundreds of thousands or millions, they are meters.
            if abs(x) > 180 or abs(y) > 90:
                try:
                    g = GEOSGeometry(json.dumps(geom))
                    # Heuristic for Rajasthan/India projected systems
                    # UTM 43N Northing is ~2.5M - 3.5M, but Easting (x) is usually < 1M.
                    # Web Mercator X for India is ~7.5M - 10M, and Y is ~1M - 4M.
                    if 2000000 < abs(y) < 4000000:
                        if abs(x) < 1000000:
                            g.srid = 32643 # UTM 43N (Rajasthan)
                        else:
                            g.srid = 3857 # Web Mercator
                    else:
                        g.srid = 3857 # Fallback to Web Mercator
                    
                    g.transform(4326)
                    return json.loads(g.geojson)
                except Exception as ex:
                    logger.warning(f"Spatial fix-up failed: {ex}")
            
            # If we swapped, we should probably stop and return the swapped version 
            # unless it also needs meter reprojection (which is handled above).
            if swapped:
                return geom
    except Exception as e:
        logger.debug(f"ensure_wgs84 heuristic skipped: {e}")
        
    return geom

from django.core.cache import cache

def get_address_from_lat_lon(lat: float, lon: float) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Performs a spatial search to find the nearest village hierarchy for a coordinate.
    Optimized for performance using squared distance.
    """
    # Build the cache key
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
        ORDER BY ((v.latitude - %s)^2 + (v.longitude - %s)^2) ASC
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(query, [lat, lon])
        row = cursor.fetchone()
        if row:
            address = {
                "vllg_name": row[0], "vllg_code": row[1],
                "gp_name": row[2], "gp_code": row[3],
                "block_name": row[4], "block_code": row[5],
                "dist_name": row[6], "dist_code": row[7],
                "state_name": "Rajasthan",
            }
            cache.set(cache_key, address, 3600 * 24) # Cache for 24 hours
            return address, row[1]
    return None, None

# =============================================================================
# BASE CLASSES & MIXINS
# =============================================================================

class IsAdminOrReadOnly(permissions.BasePermission):
    """Custom permission to allow public reads and restrict writes to staff."""
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or (request.user and request.user.is_staff)

class BaseLocationViewSet(viewsets.ModelViewSet):
    """Abstract base viewset providing common name-based filtering logic."""
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__iexact=name)
        return queryset

# =============================================================================
# MODEL VIEWSETS (CRUD)
# =============================================================================

class CountryViewSet(BaseLocationViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer

class StateViewSet(BaseLocationViewSet):
    queryset = State.objects.all().order_by('name')
    serializer_class = StateSerializer

class DistrictViewSet(BaseLocationViewSet):
    queryset = District.objects.all().order_by('name')
    serializer_class = DistrictSerializer

    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        state_id = self.request.query_params.get('state')
        state_name = self.request.query_params.get('state_name')
        if state_id: queryset = queryset.filter(state_id=state_id)
        if state_name: queryset = queryset.filter(state__name__iexact=state_name)
        return queryset

class BlockViewSet(BaseLocationViewSet):
    queryset = Block.objects.all().order_by('name')
    serializer_class = BlockSerializer

    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        dist_id = self.request.query_params.get('district')
        dist_name = self.request.query_params.get('district_name')
        if dist_id: queryset = queryset.filter(district_id=dist_id)
        if dist_name: queryset = queryset.filter(district__name__iexact=dist_name)
        return queryset

class GPViewSet(BaseLocationViewSet):
    queryset = Grampanchayat.objects.all().order_by('name')
    serializer_class = GPSerializer

    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        block_id = self.request.query_params.get('block')
        block_name = self.request.query_params.get('block_name')
        if block_id: queryset = queryset.filter(block_id=block_id)
        if block_name: queryset = queryset.filter(block__name__iexact=block_name)
        return queryset

class VillageViewSet(BaseLocationViewSet):
    queryset = Village.objects.all().order_by('name')
    serializer_class = VillageSerializer

    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        gp_id = self.request.query_params.get('gp')
        gp_name = self.request.query_params.get('gp_name')
        block_id = self.request.query_params.get('block')
        block_name = self.request.query_params.get('block_name')

        if gp_id: 
            queryset = queryset.filter(grampanchayat_id=gp_id)
        elif gp_name:
            queryset = queryset.filter(grampanchayat__name__iexact=gp_name)
        elif block_id:
            queryset = queryset.filter(grampanchayat__block_id=block_id)
        elif block_name:
            queryset = queryset.filter(grampanchayat__block__name__iexact=block_name)
        
        return queryset

# =============================================================================
# INTEGRATION & SPATIAL VIEWS
# =============================================================================

class PincodeView(APIView):
    """Reverse geocoding endpoint for finding hierarchy by coordinates."""
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        if not lat or not lon:
            return Response({"error": "Latitude and longitude required"}, status=400)

        # External Search
        try:
            res = requests.get(
                f"{GPSPL_DOMAIN}/pincode/", 
                params={"lat": lat, "lon": lon, "boundary": request.query_params.get('boundary', 'false')}, 
                headers={"X-Auth-Key": DEFAULT_EXTERNAL_API_KEY}, 
                timeout=10
            )
            if res.status_code == 200: return Response(res.json())
        except Exception as e:
            logger.error(f"External Pincode Provider Error: {e}")

        # Database Search
        address, _ = get_address_from_lat_lon(float(lat), float(lon))
        if address: return Response(address)
        return Response({"error": "Coordinates not mapped"}, status=404)

class BoundaryCollectionView(APIView):
    """Service for fetching bulk geometries for a specific administrative level."""
    authentication_classes = []  # Public access
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # 0. Cache Check
        cache_key = f"boundary_coll_{request.query_params.get('layer')}_{request.query_params.get('parent_id')}_{request.query_params.get('fetch')}"
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)

        layer = request.query_params.get('layer', 'district').lower()
        parent_id = request.query_params.get('parent_id')
        fetch = request.query_params.get('fetch', 'false').lower() == 'true'
        
        model_map = {'state': State, 'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        if layer not in model_map: return Response({"error": "Invalid layer"}, status=400)
            
        model = model_map[layer]
        if layer == 'district' and fetch: self._sync_districts()

        # Build Optimized Query with on-the-fly transformation to WGS84 (Degrees)
        try:
            queryset = model.objects.annotate(
                geom_geojson=AsGeoJSON(Transform('geometry', 4326))
            )
        except Exception:
            queryset = model.objects.all()
        
        if parent_id:
            queryset = queryset.filter(**{LAYER_PARENT_MAP[layer]: parent_id})
        else:
            # If no parent selected, limit to 200 for performance
            queryset = queryset[:200]

        # Determine available fields
        has_annotated_geom = 'geom_geojson' in [a for a in queryset.query.annotations]
        fields = ['id', 'name', 'code']
        fields.append('geom_geojson' if has_annotated_geom else 'geometry')
        
        if layer == 'village': 
            fields.extend(['latitude', 'longitude', 'grampanchayat__name'])
            queryset = queryset.select_related('grampanchayat')

        # Feature collection assembly
        features = []
        
        # 1. Include parent boundary if drilling down (Ensuring WGS84 transformation)
        if parent_id:
            try:
                p_layer_map = {'district': ('state', State), 'block': ('district', District), 'gp': ('block', Block), 'village': ('gp', Grampanchayat)}
                p_layer, p_model = p_layer_map.get(layer, (None, None))
                if p_model:
                    # Attempt transformed lookup for correct coordinate placement
                    try:
                        p_qs = p_model.objects.filter(id=parent_id).annotate(
                            g_json=AsGeoJSON(Transform('geometry', 4326))
                        )
                        p_obj = p_qs.first()
                        p_geom = json.loads(p_obj.g_json) if p_obj and p_obj.g_json else None
                    except Exception:
                        p_obj = p_model.objects.filter(id=parent_id).first()
                        p_geom = json.loads(p_obj.geometry.geojson) if p_obj and p_obj.geometry else None
                    
                    if p_obj:
                        if not p_geom and fetch:
                            p_geom = BoundaryByCodeView.fetch_and_save_boundary(p_model, p_layer, p_obj)
                        
                        # Apply spatial heuristic fix-up
                        p_geom = ensure_wgs84(p_geom)
                            
                        if p_geom:
                            features.append({
                                "type": "Feature", "id": p_obj.id,
                                "properties": {"name": p_obj.name, "code": p_obj.code, "level": p_layer, "is_parent": True},
                                "geometry": p_geom
                            })
            except Exception as e:
                logger.warning(f"Parent boundary enrichment failed: {e}")

        # 2. Process children (Optimized with pre-calculated count and external fetch caps)
        # Convert queryset to list if we are going to iterate and possibly fetch 
        # to avoid holding database connection longer than needed
        items = list(queryset.values(*fields))
        total_count = len(items)
        external_count = 0
        MAX_EXTERNAL = 8 # Reduced from 15 to improve response time

        for item in items:
            geom = None
            if has_annotated_geom:
                geom_str = item.get('geom_geojson')
                geom = json.loads(geom_str) if geom_str else None
            else:
                raw_geom = item.get('geometry')
                if raw_geom and hasattr(raw_geom, 'geojson'):
                    geom = json.loads(raw_geom.geojson)

            # Only fetch if missing AND fetch=true AND we haven't hit external limit
            if not geom and fetch and external_count < MAX_EXTERNAL:
                item_code = item.get('code')
                if not item_code and layer == 'village':
                    name = item['name'].strip()
                    loc = LocationCode.objects.filter(vlg_name__iexact=name).first()
                    if loc: item_code = loc.vlg_code
                
                if item_code:
                    cache_key = f"boundary_{layer}_{item_code}"
                    geom = cache.get(cache_key)
                    
                    if not geom:
                        # Only fetch externally for manageable sets to avoid timeouts
                        if total_count < 150:
                            geom = BoundaryByCodeView.fetch_external_boundary(layer, item_code)
                            if geom: 
                                cache.set(cache_key, geom, 3600 * 24 * 7) # Cache for 1 week
                                external_count += 1
                                # Auto-persist to DB
                                try:
                                    model.objects.filter(id=item['id']).update(geometry=GEOSGeometry(json.dumps(geom)))
                                except Exception as se:
                                    logger.debug(f"Failed to auto-save geometry for {item_code}: {se}")
            
            if not geom and layer == 'village' and item.get('latitude'):
                geom = {"type": "Point", "coordinates": [item['longitude'], item['latitude']]}
            
            # Apply spatial heuristic fix-up
            geom = ensure_wgs84(geom)
            
            features.append({
                "type": "Feature", "id": item['id'],
                "properties": {"name": item['name'], "code": item['code'], "level": layer},
                "geometry": geom if geom else None
            })
            
        result = {"type": "FeatureCollection", "features": features}
        # Cache for 1 hour to improve repeated drill-down performance
        cache.set(cache_key, result, 3600)
        return Response(result)


    def _sync_districts(self):
        """Seed-logic to maintain consistency between mapping and location tables.
        Optimized to only run if districts are missing to avoid lock contention.
        """
        try:
            # Only sync if we have no districts or specifically requested
            if District.objects.exists():
                return
                
            state = State.objects.filter(name__iexact='Rajasthan').first()
            if not state:
                india = Country.objects.get_or_create(name="India")[0]
                state = State.objects.get_or_create(name="Rajasthan", country=india)[0]

            codes = LocationCode.objects.values('dist_name', 'dist_code').distinct()
            for entry in codes:
                if entry['dist_code']:
                    # Use a more efficient way to avoid unnecessary writes
                    name = entry['dist_name'].strip()
                    if not District.objects.filter(code=entry['dist_code']).exists():
                        District.objects.create(
                            code=entry['dist_code'], 
                            name=name, 
                            state=state
                        )
        except Exception as e:
            # Log as warning since it's a soft-fail operation
            logger.warning(f"Sync deferred or failed (likely locked): {e}")


class BoundaryByCodeView(APIView):
    """Logic for single-resource boundary management and external aggregation."""
    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def fetch_and_save_boundary(model, layer, obj) -> Optional[Dict]:
        """Fetches from external API and persists to local DB."""
        geom = BoundaryByCodeView.fetch_external_boundary(layer, obj.code)
        if geom:
            try:
                # Update the database
                obj.geometry = GEOSGeometry(json.dumps(geom))
                obj.save(update_fields=['geometry'])
                logger.info(f"✅ Persisted {layer} boundary for {obj.name}")
            except Exception as e:
                logger.error(f"Failed to save fetched geometry for {obj.name}: {e}")
        return geom

    @staticmethod
    def fetch_external_boundary(layer: str, code: str) -> Optional[Dict]:
        """Robustly aggregates geometry chunks from provider into a single MultiPolygon."""
        api_params = {'village': 'village_code', 'gp': 'gpcode', 'block': 'block_code', 'district': 'district_code'}
        param = api_params.get(layer)
        if not param: return None
            
        # Try multiple code variations for maximum compatibility
        variants = [str(code)]
        if layer == 'district':
            s = str(code)
            if len(s) == 1: variants.extend([f"0{s}", f"DIST0{s}"])
            elif not s.startswith('DIST'): variants.append(f"DIST{s}")

        try:
            target_res = None
            for v in variants:
                r = requests.get(
                    f"{GPSPL_DOMAIN}/boundary-by-code/", 
                    params={param: v, 'boundary': 'true'}, 
                    headers={"X-Auth-Key": DEFAULT_EXTERNAL_API_KEY}, 
                    timeout=5
                )
                if r.status_code == 200 and len(r.text) > 1000:
                    target_res = r
                    break
            
            if not target_res: return None
            
            data = target_res.json()
            features = data.get('features') if isinstance(data, dict) else (data if isinstance(data, list) else [data])
            master_polys = []
            
            # WKT Extraction Regex
            re_wkt = r'\(([^()]*\d[^()]*)\)'
            re_coords = r'(-?\d+\.?\d*)\s+(-?\d+\.?\d*)'

            for feat in features:
                if not isinstance(feat, dict): continue
                raw = feat.get('boundary') or feat.get('geometry') or (feat if feat.get('type') in ['Polygon', 'MultiPolygon'] else None)
                if not raw: continue
                
                if isinstance(raw, dict):
                    if raw['type'] == 'Polygon': master_polys.append(raw['coordinates'])
                    elif raw['type'] == 'MultiPolygon': master_polys.extend(raw['coordinates'])
                elif isinstance(raw, str):
                    matches = re.findall(re_wkt, raw)
                    rings = [[[float(x), float(y)] for x, y in re.findall(re_coords, m)] for m in matches if m]
                    if rings: master_polys.append(rings)
            
            return {"type": "MultiPolygon", "coordinates": master_polys} if master_polys else None
        except Exception as e:
            logger.error(f"Geometry Aggregation Failure: {e}")
            return None

    def get(self, request):
        code = request.query_params.get('code')
        layer = request.query_params.get('layer', 'district')
        
        model_map = {'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        model = model_map.get(layer)
        if not model: return Response({"error": "Invalid layer"}, status=400)

        # Lookup
        obj = model.objects.filter(code=code).first() or model.objects.filter(name__iexact=code).first()
        if not obj and layer == 'district':
            entry = LocationCode.objects.filter(dist_code=code).first() or LocationCode.objects.filter(dist_name__iexact=code).first()
            if entry:
                st = State.objects.filter(name__iexact='Rajasthan').first()
                obj, _ = District.objects.update_or_create(code=entry.dist_code, defaults={'name': entry.dist_name, 'state': st})

        if not obj: return Response({"error": "Resource not found"}, status=404)

        # Geometry Refresh check: Always attempt to fetch from external API if missing in DB
        db_geom = model.objects.filter(id=obj.id).annotate(
            geom_geojson=AsGeoJSON(Transform('geometry', 4326))
        ).values('geom_geojson').first()
        
        geom = json.loads(db_geom['geom_geojson']) if db_geom and db_geom['geom_geojson'] else None
        
        if not geom:
            geom = self.fetch_and_save_boundary(model, layer, obj)

        # Apply spatial heuristic fix-up (Crucial for fixing 'map in wrong place')
        geom = ensure_wgs84(geom)

        # Final Formatting
        if isinstance(geom, str) and '{' in geom:
            try: geom = json.loads(geom)
            except: pass

        return Response({
            "type": "Feature",
            "properties": {"name": obj.name, "code": obj.code},
            "geometry": geom
        })



class ExternalRequestProxyView(APIView):
    """Secure tunnel for frontend clients to access the external GIS stack."""
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def handle_request(self, request, endpoint, method='GET'):
        url = f"{GPSPL_DOMAIN}/{endpoint}/"
        headers = {"X-Auth-Key": DEFAULT_EXTERNAL_API_KEY}
        try:
            if method == 'GET':
                 res = requests.get(url, params=request.query_params, headers=headers, timeout=15)
            else:
                 res = requests.post(url, json=request.data, headers=headers, timeout=15)
            return Response(res.json(), status=res.status_code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def get(self, request, endpoint): return self.handle_request(request, endpoint, 'GET')
    def post(self, request, endpoint): return self.handle_request(request, endpoint, 'POST')


class LocationCodeView(generics.ListAPIView):
    """Exposes the flattened administrative mapping table."""
    queryset = LocationCode.objects.all().order_by('dist_name', 'block_name')
    serializer_class = LocationHierarchySerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get_queryset(self) -> QuerySet:
        qs = super().get_queryset()
        for p in ['dist_name', 'block_name', 'gp_name', 'vlg_name']:
            v = self.request.query_params.get(p)
            if v: qs = qs.filter(**{f"{p}__iexact": v})
        return qs
