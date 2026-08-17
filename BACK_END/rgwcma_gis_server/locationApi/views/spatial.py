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
from layersApi.models import SpatialLayer
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
    """Fetch a specific boundary by its unique administrative code or name."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        layer = request.query_params.get('layer', 'district').lower()
        code = request.query_params.get('code')
        obj_id = request.query_params.get('id')
        name = request.query_params.get('name')
        meta_only = request.query_params.get('meta_only', 'false').lower() == 'true'
        
        if not code and not obj_id and not name: 
            return Response({"error": "Code, ID, or Name parameter required"}, status=400)
            
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
        if not obj and name:
            obj = model.objects.filter(name__iexact=name.strip()).first()
        if not obj and name:
            obj = model.objects.filter(name__icontains=name.strip()).first()
        
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
    Uses high-performance PostGIS cascading queries with Redis grid caching.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat, lon = request.query_params.get('lat'), request.query_params.get('lon')
        if not lat or not lon: 
            return Response({"error": "lat and lon required"}, status=400)

        try:
            flat_lat, flat_lon = float(lat), float(lon)
        except ValueError:
            return Response({"error": "Invalid coordinates format"}, status=400)

        # Truncate to 3 decimal places (~111m grid) to hit cache for nearby clicks
        cache_key = f"point_id_v7_{round(flat_lat, 3)}_{round(flat_lon, 3)}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            # Inject original fresh lat/lon so map pins drop exactly where clicked
            cached_result['lat'] = flat_lat
            cached_result['lon'] = flat_lon
            return Response(cached_result)

        try:
            point = GEOSGeometry(f'POINT({flat_lon} {flat_lat})', srid=4326)
            result = {"lat": flat_lat, "lon": flat_lon}
            
            # Cascading Spatial Search - start at lowest hierarchy level (Village)
            # If hit, select_related fetches all parents in a single query
            village = Village.objects.select_related(
                'grampanchayat', 
                'grampanchayat__block', 
                'grampanchayat__block__district'
            ).filter(geometry__intersects=point).first()

            if village:
                gp = village.grampanchayat
                block = gp.block
                dist = block.district
                result.update({
                    "village": village.name, "village_id": village.id, "village_code": village.code,
                    "gramPanchayat": gp.name, "gramPanchayat_id": gp.id, "gramPanchayat_code": gp.code,
                    "block": block.name, "block_id": block.id, "block_code": block.code,
                    "district": dist.name, "district_id": dist.id, "district_code": dist.code
                })
            else:
                # Fallback to GP
                gp = Grampanchayat.objects.select_related(
                    'block', 'block__district'
                ).filter(geometry__intersects=point).first()
                if gp:
                    block = gp.block
                    dist = block.district
                    result.update({
                        "gramPanchayat": gp.name, "gramPanchayat_id": gp.id, "gramPanchayat_code": gp.code,
                        "block": block.name, "block_id": block.id, "block_code": block.code,
                        "district": dist.name, "district_id": dist.id, "district_code": dist.code
                    })
                else:
                    # Fallback to Block
                    block = Block.objects.select_related('district').filter(geometry__intersects=point).first()
                    if block:
                        dist = block.district
                        result.update({
                            "block": block.name, "block_id": block.id, "block_code": block.code,
                            "district": dist.name, "district_id": dist.id, "district_code": dist.code
                        })
                    else:
                        # Fallback to District
                        dist = District.objects.filter(geometry__intersects=point).first()
                        if dist:
                            result.update({
                                "district": dist.name, "district_id": dist.id, "district_code": dist.code
                            })

            # Check for Groundwater Zone (GWRE Category)
            gw_zone = SpatialLayer.objects.filter(layer_type='groundwater_zone', geometry__intersects=point).first()
            if gw_zone:
                result["gw_category"] = gw_zone.properties.get('category') or getattr(gw_zone, 'category', None)
                
            # Check for Aquifer
            aquifer_zone = SpatialLayer.objects.filter(layer_type='aquifer', geometry__intersects=point).first()
            if aquifer_zone:
                result["aquifer"] = aquifer_zone.aquifer_type or aquifer_zone.properties.get('Aquifer') or aquifer_zone.name
                
            # Check for Water Resources (Canal, Waterbody)
            wr = SpatialLayer.objects.filter(layer_type__in=['canal', 'waterbody'], geometry__intersects=point).first()
            if not wr:
                # If no exact intersection, try nearby search for lines/polygons
                wr = SpatialLayer.objects.filter(layer_type__in=['canal', 'waterbody'], geometry__distance_lte=(point, 0.01)).first()
            if wr:
                result["water_resource"] = wr.name or wr.properties.get('Name') or wr.properties.get('CANAL_NAME') or wr.layer_type.capitalize()

            # Check for Recharge Structure
            from rechargeStructureApi.models import RechargeStructure
            bbox_tol = 0.05
            recharge = RechargeStructure.objects.filter(
                latitude__gte=flat_lat - bbox_tol, latitude__lte=flat_lat + bbox_tol,
                longitude__gte=flat_lon - bbox_tol, longitude__lte=flat_lon + bbox_tol
            ).first() # Just grab the first one found nearby for simplicity
            if recharge:
                result["water_resource"] = f"{recharge.structure_type} ({recharge.status})" if recharge.status else recharge.structure_type
                
            # For Rainfall, Piezometer, and Well Inventory (AquiferData)
            from raingaugeApi.models import RainGauge
            from pizometerApi.models import Piezometer
            from aquiferApi.models import AquiferData
            
            # Rainfall - Find station if near, else fallback to district average
            raingauges = RainGauge.objects.filter(
                latitude__gte=flat_lat - bbox_tol, latitude__lte=flat_lat + bbox_tol,
                longitude__gte=flat_lon - bbox_tol, longitude__lte=flat_lon + bbox_tol
            ).order_by('-date')[:20]
            if raingauges:
                def dist_r(r):
                    return (r.latitude - flat_lat)**2 + (r.longitude - flat_lon)**2
                closest_r = min(raingauges, key=dist_r)
                result["rainfall"] = closest_r.rainfall_mm
            elif result.get('district_id') or result.get('district'):
                # District fallback - Average of all records in this district
                from django.db.models import Avg
                from rainfallApi.models import Rainfall, StationRainfall
                
                # Try standard Rainfall model first
                avg_r = None
                if result.get('district_id'):
                    avg_r = Rainfall.objects.filter(
                        village__grampanchayat__block__district_id=result['district_id']
                    ).aggregate(avg=Avg('rainfall_mm'))['avg']
                
                # If no records in Rainfall model, try StationRainfall (often used for choropleths)
                if not avg_r and result.get('district'):
                    avg_r = StationRainfall.objects.filter(
                        station__district__iexact=result['district']
                    ).aggregate(avg=Avg('rainfall_mm'))['avg']
                
                if avg_r:
                    result["rainfall"] = round(avg_r, 1)

            # Piezometer (Real-time Water Level)
            piezometers = Piezometer.objects.filter(
                latitude__gte=flat_lat - bbox_tol, latitude__lte=flat_lat + bbox_tol,
                longitude__gte=flat_lon - bbox_tol, longitude__lte=flat_lon + bbox_tol
            ).order_by('-date')[:20]
            if piezometers:
                def dist_p(p):
                    return (p.latitude - flat_lat)**2 + (p.longitude - flat_lon)**2
                closest_p = min(piezometers, key=dist_p)
                result["water_level"] = closest_p.water_level_depth

            # Well Inventory (Aquifer Monitoring Wells) - Find well if near, else district average
            wells = AquiferData.objects.filter(
                latitude__gte=flat_lat - bbox_tol, latitude__lte=flat_lat + bbox_tol,
                longitude__gte=flat_lon - bbox_tol, longitude__lte=flat_lon + bbox_tol
            ).select_related('village')[:20]
            
            if wells:
                def dist_w(w):
                    return (w.latitude - flat_lat)**2 + (w.longitude - flat_lon)**2
                closest_w = min(wells, key=dist_w)
                wl = closest_w.pst_2024 if closest_w.pst_2024 is not None else closest_w.pre_2024
                if wl is not None:
                    result["water_level"] = wl
                result["aquifer"] = result.get("aquifer") or closest_w.aquifer
            elif result.get('district_id'):
                # District fallback for water level
                from django.db.models import Avg
                avg_wl = AquiferData.objects.filter(
                    village__grampanchayat__block__district_id=result['district_id']
                ).aggregate(avg=Avg('pst_2024'))['avg']
                if avg_wl:
                    result["water_level"] = round(avg_wl, 1)

            # Cache the result for exactly this grid block for 24 hours
            # Cache original grid result, missing the "exact" lat lon to avoid drift
            cache_payload = result.copy()
            cache.set(cache_key, cache_payload, 86400)
            
            return Response(result)

        except Exception as e:
            logger.error(f"PointIdentifyView Error: {e}")
            return Response({"error": "Failed to resolve coordinates spatially.", "details": str(e)}, status=500)

class PointByCodeView(APIView):
    # (Leaving original code for reference or removing if not needed, but keeping the file structure)
    pass
