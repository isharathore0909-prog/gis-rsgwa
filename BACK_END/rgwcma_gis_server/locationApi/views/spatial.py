import json
import logging
import requests
from typing import Optional, Dict
from django.contrib.gis.db.models.functions import Transform, AsGeoJSON
from django.contrib.gis.geos import GEOSGeometry
from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .base import (
    GPSPL_DOMAIN, DEFAULT_EXTERNAL_API_KEY, LAYER_PARENT_MAP, 
    ensure_wgs84, get_address_from_lat_lon
)
from ..models import Country, State, District, Block, Grampanchayat, Village, LocationCode
from ..authentication import ApiKeyAuthentication
from ..permissions import HasValidApiKey

logger = logging.getLogger(__name__)

class PincodeView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        if not lat or not lon:
            return Response({"error": "Latitude and longitude required"}, status=400)
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
        address, _ = get_address_from_lat_lon(float(lat), float(lon))
        if address: return Response(address)
        return Response({"error": "Coordinates not mapped"}, status=404)

class BoundaryCollectionView(APIView):
    """Retrieve administrative boundaries for hierarchical drill-down and dropdowns."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        layer = request.query_params.get('layer', 'district').lower()
        parent_id = request.query_params.get('parent_id')
        meta_only = request.query_params.get('meta_only', 'true').lower() == 'true'
        
        cache_key = f"boundary_coll_v2_{layer}_{parent_id}_{meta_only}"
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        model_map = {'state': State, 'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        if layer not in model_map: return Response({"error": "Invalid layer"}, status=400)
        model = model_map[layer]
        
        queryset = model.objects.all()
        if parent_id: 
            queryset = queryset.filter(**{LAYER_PARENT_MAP[layer]: parent_id})
        else: 
            queryset = queryset[:200]

        fields = ['id', 'name', 'code']
        if not meta_only:
            fields.append('geometry')
        if layer == 'village': 
            fields.extend(['latitude', 'longitude'])

        items = list(queryset.values(*fields))
        features = []
        for item in items:
            geom = None
            if not meta_only:
                raw_geom = item.get('geometry')
                if raw_geom and hasattr(raw_geom, 'geojson'): 
                    geom = json.loads(raw_geom.geojson)
            elif layer == 'village' and item.get('latitude'): 
                geom = {"type": "Point", "coordinates": [item['longitude'], item['latitude']]}
            
            features.append({
                "type": "Feature", 
                "id": item['id'], 
                "properties": {"name": item['name'], "code": item['code'], "level": layer}, 
                "geometry": ensure_wgs84(geom)
            })
            
        result = {"type": "FeatureCollection", "features": features}
        cache.set(cache_key, result, 3600)
        return Response(result)

class BoundaryByCodeView(APIView):
    """Fetch a specific boundary by its unique administrative code."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        layer = request.query_params.get('layer', 'district').lower()
        code = request.query_params.get('code')
        obj_id = request.query_params.get('id')
        meta_only = request.query_params.get('meta_only', 'false').lower() == 'true'
        
        if not code and not obj_id: 
            return Response({"error": "Code or ID parameter required"}, status=400)
            
        model_map = {'state': State, 'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        if layer not in model_map: return Response({"error": "Invalid layer"}, status=400)
            
        model = model_map[layer]
        obj = None

        if obj_id:
            obj = model.objects.filter(id=obj_id).first()
        if not obj and code:
            obj = model.objects.filter(code=code).first()
        if not obj and code and code.isdigit():
            obj = model.objects.filter(id=code).first()
        
        if not obj: 
            return Response({"error": f"No {layer} found"}, status=404)
            
        geom = None
        if not meta_only and obj.geometry:
            try: geom = json.loads(obj.geometry.geojson)
            except: geom = None
            
        return Response({
            "type": "Feature",
            "id": obj.id,
            "properties": {
                "name": obj.name,
                "code": obj.code,
                "level": layer,
                "parent_id": getattr(obj, LAYER_PARENT_MAP.get(layer, 'None'), None)
            },
            "geometry": ensure_wgs84(geom) if not meta_only else None
        })

class PointIdentifyView(APIView):
    """Identify administrative units (District, Block, GP, Village) for a point (lat, lon).
    Uses GeoServer WMS GetFeatureInfo as the primary source.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    GEOSERVER_WMS_URL = "http://localhost:8080/geoserver/rgwcma/wms"

    def _query_geoserver(self, lat, lon, layer):
        try:
            delta = 0.005
            bbox = f"{float(lon) - delta},{float(lat) - delta},{float(lon) + delta},{float(lat) + delta}"
            params = {
                "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetFeatureInfo",
                "LAYERS": layer, "QUERY_LAYERS": layer, "BBOX": bbox,
                "SRS": "EPSG:4326", "WIDTH": "101", "HEIGHT": "101", "X": "50", "Y": "50",
                "INFO_FORMAT": "application/json", "FEATURE_COUNT": "1",
            }
            resp = requests.get(self.GEOSERVER_WMS_URL, params=params, timeout=5)
            if resp.status_code == 200: return resp.json().get("features", [])
        except: pass
        return []

    def get(self, request):
        lat, lon = request.query_params.get('lat'), request.query_params.get('lon')
        if not lat or not lon: return Response({"error": "lat and lon required"}, status=400)

        try:
            # Hierarchical Identification via WMS
            result = {"lat": float(lat), "lon": float(lon)}
            layers = {
                "district": "rgwcma:locationApi_district",
                "block": "rgwcma:locationApi_block",
                "gramPanchayat": "rgwcma:locationApi_grampanchayat",
                "village": "rgwcma:locationApi_village"
            }
            
            for key, layer_name in layers.items():
                features = self._query_geoserver(lat, lon, layer_name)
                if features:
                    props = features[0].get("properties", {})
                    result[key] = props.get("name") or props.get("DIST_NAME") or props.get("BLOCK_NAME") or props.get("GP_NAME") or props.get("VILLAGE_NA")
                    result[f"{key}_id"] = props.get("id")
                    result[f"{key}_code"] = props.get("code") or props.get("dist_code") or props.get("block_code")
            
            # DB Fallback for minimal district/block info if WMS fails
            if not result.get('district'):
                try:
                    point = GEOSGeometry(f'POINT({lon} {lat})', srid=4326)
                    dist = District.objects.filter(geometry__intersects=point).first()
                    if dist:
                        result.update({"district": dist.name, "district_id": dist.id, "district_code": dist.code})
                        blk = Block.objects.filter(geometry__intersects=point).first()
                        if blk: result.update({"block": blk.name, "block_id": blk.id, "block_code": blk.code})
                except: pass
                
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class PointByCodeView(APIView):
    # (Leaving original code for reference or removing if not needed, but keeping the file structure)
    pass
