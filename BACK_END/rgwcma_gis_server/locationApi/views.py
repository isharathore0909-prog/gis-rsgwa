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
from rest_framework import viewsets, permissions, status, generics
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

class AsGeoJSON(Func):
    """Encapsulates PostGIS ST_AsGeoJSON function for Django QuerySets."""
    function = 'ST_AsGeoJSON'

def get_address_from_lat_lon(lat: float, lon: float) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Performs a spatial search to find the nearest village hierarchy for a coordinate.
    """
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
    permission_classes = [IsAdminOrReadOnly]
    
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
    
    # Simple in-memory cache for external boundaries
    _external_cache = {}

    def get(self, request):
        layer = request.query_params.get('layer', 'district').lower()
        parent_id = request.query_params.get('parent_id')
        fetch = request.query_params.get('fetch', 'false').lower() == 'true'
        
        model_map = {'state': State, 'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        if layer not in model_map: return Response({"error": "Invalid layer"}, status=400)
            
        model = model_map[layer]
        if layer == 'district' and fetch: self._sync_districts()

        # Build Optimized Query
        queryset = model.objects.filter(**{LAYER_PARENT_MAP[layer]: parent_id}) if parent_id else model.objects.all()

        fields = ['id', 'name', 'code']
        if layer == 'village': 
            fields.extend(['latitude', 'longitude', 'grampanchayat__name', 'grampanchayat_id'])
            # Ensure we can follow the relationship
            queryset = queryset.select_related('grampanchayat')
        
        if connection.vendor == 'postgresql': fields.append('geometry_geojson')
            
        # Optimization: Bulk lookup from LocationCode for villages
        location_code_map = {}
        if layer == 'village' and fetch:
            vlg_names = [item['name'].strip() for item in queryset.values('name')]
            # Limit list size to avoid extreme query length
            if len(vlg_names) < 1000:
                loc_codes = LocationCode.objects.filter(vlg_name__in=vlg_names).values('vlg_name', 'gp_name', 'vlg_code')
                for lc in loc_codes:
                    key = (lc['vlg_name'].strip().lower(), lc['gp_name'].strip().lower())
                    location_code_map[key] = lc['vlg_code']
                    # Also store by just name for fallback
                    if lc['vlg_name'].strip().lower() not in location_code_map:
                        location_code_map[lc['vlg_name'].strip().lower()] = lc['vlg_code']

        features = []
        for item in queryset.values(*fields):
            geom = item.get('geometry_geojson')
            
            # Fidelity enrichment
            if fetch:
                # Optimized boundary fetch
                if layer == 'village':
                    name = item['name'].strip().lower()
                    gp_name = item.get('grampanchayat__name', '').strip().lower()
                    code = item.get('code') or location_code_map.get((name, gp_name)) or location_code_map.get(name)
                    
                    if code:
                        cache_key = f"{layer}_{code}"
                        if cache_key in self._external_cache:
                            geom = self._external_cache[cache_key]
                        else:
                            geom = BoundaryByCodeView.fetch_external_boundary(layer, code)
                            if geom: self._external_cache[cache_key] = geom
                else:
                    # Non-village layers usually don't have 'fetch' enabled in frontend but handled for consistency
                    geom = self._fetch_layer_boundary(model, layer, item)
            
            # Fallback for village centroids
            if not geom and layer == 'village' and item.get('latitude'):
                geom = {"type": "Point", "coordinates": [item['longitude'], item['latitude']]}
            
            features.append({
                "type": "Feature", "id": item['id'],
                "properties": {"name": item['name'], "code": item['code'], "level": layer},
                "geometry": geom if geom else None
            })
            
        return Response({"type": "FeatureCollection", "features": features})


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

    def _fetch_layer_boundary(self, model, layer: str, item: Dict) -> Optional[Dict]:
        """Resolves naming variations and fetches boundary from GPSPL.
        As per user request: Only fetch if layer is 'village'.
        """
        if layer != 'village':
            return None

        # Prefer code from LocationCode table for accuracy
        name = item['name'].strip()
        gp_name = item.get('grampanchayat__name', '').strip()
        
        code = item.get('code')
        
        # Priority: Lookup in LocationCode by Village + GP name
        loc = LocationCode.objects.filter(vlg_name__iexact=name, gp_name__iexact=gp_name).first()
        if not loc:
            # Fallback to village name only if GP name match fails
            loc = LocationCode.objects.filter(vlg_name__iexact=name).first()
            
        if loc:
            code = loc.vlg_code

        if code:
            return BoundaryByCodeView.fetch_external_boundary(layer, code)
        return None


class BoundaryByCodeView(APIView):
    """Logic for single-resource boundary management and external aggregation."""
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [IsAdminOrReadOnly]

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
                    timeout=15
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

        # Geometry Refresh check
        # We now always fetch from external API if requested or needed, as DB storage is removed
        geom = self.fetch_external_boundary(layer, obj.code)

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
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self) -> QuerySet:
        qs = super().get_queryset()
        for p in ['dist_name', 'block_name', 'gp_name', 'vlg_name']:
            v = self.request.query_params.get(p)
            if v: qs = qs.filter(**{f"{p}__iexact": v})
        return qs
