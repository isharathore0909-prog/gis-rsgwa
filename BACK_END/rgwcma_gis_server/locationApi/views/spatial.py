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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cache_key = f"boundary_coll_{request.query_params.get('layer')}_{request.query_params.get('parent_id')}_{request.query_params.get('fetch')}"
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        layer = request.query_params.get('layer', 'district').lower()
        parent_id = request.query_params.get('parent_id')
        fetch = request.query_params.get('fetch', 'false').lower() == 'true'
        model_map = {'state': State, 'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        if layer not in model_map: return Response({"error": "Invalid layer"}, status=400)
        model = model_map[layer]
        if layer == 'district' and fetch: self._sync_districts()

        try:
            queryset = model.objects.annotate(geom_geojson=AsGeoJSON(Transform('geometry', 4326)))
        except Exception:
            queryset = model.objects.all()
        if parent_id: queryset = queryset.filter(**{LAYER_PARENT_MAP[layer]: parent_id})
        else: queryset = queryset[:200]

        has_annotated_geom = 'geom_geojson' in [a for a in queryset.query.annotations]
        fields = ['id', 'name', 'code']
        fields.append('geom_geojson' if has_annotated_geom else 'geometry')
        if layer == 'village': 
            fields.extend(['latitude', 'longitude', 'grampanchayat__name'])
            queryset = queryset.select_related('grampanchayat')

        features = []
        if parent_id:
            try:
                p_layer_map = {'district': ('state', State), 'block': ('district', District), 'gp': ('block', Block), 'village': ('gp', Grampanchayat)}
                p_layer, p_model = p_layer_map.get(layer, (None, None))
                if p_model:
                    try:
                        p_qs = p_model.objects.filter(id=parent_id).annotate(g_json=AsGeoJSON(Transform('geometry', 4326)))
                        p_obj = p_qs.first()
                        p_geom = json.loads(p_obj.g_json) if p_obj and p_obj.g_json else None
                    except Exception:
                        p_obj = p_model.objects.filter(id=parent_id).first()
                        p_geom = json.loads(p_obj.geometry.geojson) if p_obj and p_obj.geometry else None
                    if p_obj:
                        if not p_geom and fetch: p_geom = BoundaryByCodeView.fetch_and_save_boundary(p_model, p_layer, p_obj)
                        p_geom = ensure_wgs84(p_geom)
                        if p_geom:
                            features.append({"type": "Feature", "id": p_obj.id, "properties": {"name": p_obj.name, "code": p_obj.code, "level": p_layer, "is_parent": True}, "geometry": p_geom})
            except Exception as e: logger.warning(f"Parent boundary enrichment failed: {e}")

        items = list(queryset.values(*fields))
        total_count = len(items)
        external_count, MAX_EXTERNAL = 0, 8
        for item in items:
            geom = None
            if has_annotated_geom:
                geom_str = item.get('geom_geojson')
                geom = json.loads(geom_str) if geom_str else None
            else:
                raw_geom = item.get('geometry')
                if raw_geom and hasattr(raw_geom, 'geojson'): geom = json.loads(raw_geom.geojson)
            if not geom and fetch and external_count < MAX_EXTERNAL:
                item_code = item.get('code')
                if not item_code and layer == 'village':
                    loc = LocationCode.objects.filter(vlg_name__iexact=item['name'].strip()).first()
                    if loc: item_code = loc.vlg_code
                if item_code:
                    item_cache_key = f"boundary_{layer}_{item_code}"
                    geom = cache.get(item_cache_key)
                    if not geom and total_count < 150:
                        geom = BoundaryByCodeView.fetch_external_boundary(layer, item_code)
                        if geom: 
                            cache.set(item_cache_key, geom, 3600 * 24 * 7)
                            external_count += 1
                            try: model.objects.filter(id=item['id']).update(geometry=GEOSGeometry(json.dumps(geom)))
                            except Exception as se: logger.debug(f"Failed to auto-save geometry for {item_code}: {se}")
            if not geom and layer == 'village' and item.get('latitude'): geom = {"type": "Point", "coordinates": [item['longitude'], item['latitude']]}
            geom = ensure_wgs84(geom)
            features.append({"type": "Feature", "id": item['id'], "properties": {"name": item['name'], "code": item['code'], "level": layer}, "geometry": geom if geom else None})
        result = {"type": "FeatureCollection", "features": features}
        cache.set(cache_key, result, 3600)
        return Response(result)

    def _sync_districts(self):
        try:
            if District.objects.exists(): return
            state = State.objects.filter(name__iexact='Rajasthan').first()
            if not state:
                india = Country.objects.get_or_create(name="India")[0]
                state = State.objects.get_or_create(name="Rajasthan", country=india)[0]
            codes = LocationCode.objects.values('dist_name', 'dist_code').distinct()
            for entry in codes:
                if entry['dist_code']:
                    if not District.objects.filter(code=entry['dist_code']).exists():
                        District.objects.create(code=entry['dist_code'], name=entry['dist_name'].strip(), state=state)
        except Exception as e: logger.warning(f"Sync deferred or failed (likely locked): {e}")

class BoundaryByCodeView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @staticmethod
    def fetch_and_save_boundary(model, layer, obj) -> Optional[Dict]:
        geom = BoundaryByCodeView.fetch_external_boundary(layer, obj.code)
        if geom:
            try:
                obj.geometry = GEOSGeometry(json.dumps(geom))
                obj.save(update_fields=['geometry'])
                logger.info(f"✅ Persisted {layer} boundary for {obj.name}")
            except Exception as e: logger.error(f"Failed to save fetched geometry for {obj.name}: {e}")
        return geom

    @staticmethod
    def fetch_external_boundary(layer: str, code: str) -> Optional[Dict]:
        api_params = {'village': 'village_code', 'gp': 'gpcode', 'block': 'block_code', 'district': 'district_code'}
        param = api_params.get(layer)
        if not param: return None
        variants = [str(code)]
        if layer == 'district':
            s = str(code)
            if len(s) == 1: variants.extend([f"0{s}", f"DIST0{s}"])
            elif not s.startswith('DIST'): variants.append(f"DIST{s}")
        try:
            target_res = None
            for v in variants:
                r = requests.get(f"{GPSPL_DOMAIN}/boundary-by-code/", params={param: v, 'boundary': 'true'}, headers={"X-Auth-Key": DEFAULT_EXTERNAL_API_KEY}, timeout=5)
                if r.status_code == 200 and len(r.text) > 1000:
                    target_res = r
                    break
            if not target_res: return None
            data = target_res.json()
            features = data.get('features') if isinstance(data, dict) else (data if isinstance(data, list) else [data])
            master_polys, re_wkt, re_coords = [], r'\(([^()]*\d[^()]*)\)', r'(-?\d+\.?\d*)\s+(-?\d+\.?\d*)'
            import re
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
        code, layer = request.query_params.get('code'), request.query_params.get('layer', 'district')
        model_map = {'district': District, 'block': Block, 'gp': Grampanchayat, 'village': Village}
        model = model_map.get(layer)
        if not model: return Response({"error": "Invalid layer"}, status=400)
        obj = model.objects.filter(code=code).first() or model.objects.filter(name__iexact=code).first()
        if not obj and layer == 'district':
            entry = LocationCode.objects.filter(dist_code=code).first() or LocationCode.objects.filter(dist_name__iexact=code).first()
            if entry:
                india, _ = Country.objects.get_or_create(name="India")
                st, _ = State.objects.get_or_create(name="Rajasthan", defaults={'country': india})
                obj, _ = District.objects.update_or_create(code=entry.dist_code, defaults={'name': entry.dist_name, 'state': st})
        if not obj: return Response({"error": "Resource not found"}, status=404)
        db_geom = model.objects.filter(id=obj.id).annotate(geom_geojson=AsGeoJSON(Transform('geometry', 4326))).values('geom_geojson').first()
        geom = json.loads(db_geom['geom_geojson']) if db_geom and db_geom['geom_geojson'] else None
        if not geom: geom = BoundaryByCodeView.fetch_and_save_boundary(model, layer, obj)
        geom = ensure_wgs84(geom)
        if isinstance(geom, str) and '{' in geom:
            try: geom = json.loads(geom)
            except: pass
        return Response({"type": "Feature", "properties": {"name": obj.name, "code": obj.code}, "geometry": geom})
