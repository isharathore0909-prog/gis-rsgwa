import json
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.db.models.functions import Intersection
from django.core.cache import cache
from django.db.models import Q

from ..models import SpatialLayer
from ..serializers import SpatialLayerSerializer
from core.spatial_utils import normalize_geometry_crs
from core.services.cache_utils import build_cache_key
from django.contrib.gis.db.models.functions import Intersection, Area, Transform, GeomOutputGeoFunc
from django.db.models import Sum, Count, FloatField, F
from django.db.models.functions import Cast

class Simplify(GeomOutputGeoFunc):
    function = 'ST_Simplify'
    arity = 2

logger = logging.getLogger(__name__)

def _normalize_category(name):
    cat_lower = str(name).lower().strip()
    if 'over' in cat_lower and 'exploited' in cat_lower: return 'Over Exploited'
    if 'semi' in cat_lower: return 'Semi Critical'
    if 'critical' in cat_lower: return 'Critical'
    if 'safe' in cat_lower: return 'Safe'
    if 'saline' in cat_lower: return 'Saline'
    return name

def _get_boundary_geometry(district=None, block=None, grampanchayat=None, village=None):
    try:
        from locationApi.models import District as DistrictModel, Block as BlockModel, Grampanchayat as GrampanchayatModel, Village as VillageModel
        
        if village and village.strip() and village.strip().lower() not in ['-- all villages --', 'none', '']:
            # Try to match by village name and GP name (most specific)
            vlg_q = Q(name__icontains=village.strip())
            if grampanchayat and grampanchayat.strip() and grampanchayat.strip().lower() not in ['-- all gram panchayats --', '-- all gram panchayat --', 'none', '']: 
                vlg_q &= Q(grampanchayat__name__icontains=grampanchayat.strip())
            elif block and block.strip(): 
                vlg_q &= Q(grampanchayat__block__name__icontains=block.strip())
            vlg = VillageModel.objects.filter(vlg_q).exclude(geometry__isnull=True).first()
            if vlg and vlg.geometry: return normalize_geometry_crs(vlg.geometry)
            
        if grampanchayat and grampanchayat.strip() and grampanchayat.strip().lower() not in ['-- all gram panchayats --', '-- all gram panchayat --', 'none', '']:
            gp_q = Q(name__icontains=grampanchayat.strip())
            if block and block.strip(): gp_q &= Q(block__name__icontains=block.strip())
            elif district and district.strip(): gp_q &= Q(block__district__name__icontains=district.strip())
            gp = GrampanchayatModel.objects.filter(gp_q).exclude(geometry__isnull=True).first()
            if gp and gp.geometry: return normalize_geometry_crs(gp.geometry)
            
        if block:
            blk_q = Q(name__icontains=block.strip())
            if district: blk_q &= Q(district__name__icontains=district.strip())
            blk = BlockModel.objects.filter(blk_q).exclude(geometry__isnull=True).first()
            if blk and blk.geometry: return normalize_geometry_crs(blk.geometry)
            
        if district:
            dist = DistrictModel.objects.filter(name__icontains=district.strip()).exclude(geometry__isnull=True).first()
            if dist and dist.geometry: return normalize_geometry_crs(dist.geometry)
            
    except Exception as e: logger.warning(f"Boundary geometry lookup failed: {e}")
    return None

class SpatialLayerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SpatialLayer.objects.all()
    serializer_class = SpatialLayerSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['layer_type']

    def list(self, request, *args, **kwargs):
        layer_type = request.query_params.get('layer_type')
        if not layer_type: return super().list(request, *args, **kwargs)
        
        # Determine simplification tolerance
        # Default for state-wide view is 0.001 (approx 100m)
        try: tolerance = float(request.query_params.get('simplify', 0.001))
        except: tolerance = 0.001
        
        cache_key = build_cache_key(f"layers_fc_{tolerance}", request)
        cached = cache.get(cache_key)
        if cached: return Response(cached)
        
        queryset = self.filter_queryset(self.get_queryset())
        if layer_type:
            queryset = queryset.filter(layer_type=layer_type)
            
        # Apply simplification to reduce GeoJSON size
        if tolerance > 0:
            queryset = queryset.annotate(display_geometry=Simplify('geometry', tolerance))
        else:
            queryset = queryset.annotate(display_geometry=F('geometry'))
            
        features = []
        # Use values() for better performance with large datasets
        items = queryset.values('id', 'name', 'properties', 'layer_type', 'display_geometry')
        
        for item in items:
            geom = item.get('display_geometry')
            if not geom: continue
            
            props = {**(item.get('properties') or {})}
            status_val = props.get('Category') or props.get('block_status') or props.get('BLOCK_STAT') or props.get('GWDL') or props.get('BLOCK_STATUS')
            if status_val:
                props['Category'] = _normalize_category(status_val)

            features.append({
                "type": "Feature", 
                "id": item['id'], 
                "properties": {
                    "name": item.get('name') or props.get('BLOCK_NAME'), 
                    "layer_type": item['layer_type'], 
                    **props
                }, 
                "geometry": json.loads(geom.geojson)
            })
            
        result = {"type": "FeatureCollection", "features": features}
        cache.set(cache_key, result, 1800)
        return Response(result)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        layer_type = request.query_params.get('layer_type', 'aquifer')
        district = request.query_params.get('district', '').strip()
        block = request.query_params.get('block', '').strip()
        gp = request.query_params.get('grampanchayat', '').strip() or request.query_params.get('gp', '').strip()
        village = request.query_params.get('village', '').strip()
        
        queryset = SpatialLayer.objects.filter(layer_type=layer_type)
        
        property_q = Q()
        if district:
            dist_q = Q(properties__District__iexact=district) | Q(properties__DISTRICT__iexact=district) | \
                     Q(properties__New_Dist__iexact=district) | Q(properties__DIST_NAME__iexact=district) | \
                     Q(properties__dist_name__iexact=district) | Q(properties__DISTRICT_N__iexact=district)
            property_q &= dist_q
        if block:
            block_q = Q(properties__Block__iexact=block) | Q(properties__BLOCK__iexact=block) | \
                      Q(properties__block_name__iexact=block) | Q(properties__BLOCK_NAME__iexact=block) | \
                      Q(properties__Block_Name__iexact=block)
            property_q &= block_q
        if village:
            vlg_q = Q(properties__Village__iexact=village) | Q(properties__VILLAGE__iexact=village) | \
                    Q(properties__village_name__iexact=village) | Q(properties__VILLAGE_NA__iexact=village)
            property_q &= vlg_q

        spatial_filter_applied, boundary_geom = False, _get_boundary_geometry(district=district or None, block=block or None, grampanchayat=gp or None, village=village or None)
        if boundary_geom:
            try:
                # Use spatial intersection as the primary filter when a boundary geometry is found.
                # This is more reliable than property matching which varies between datasets.
                queryset = queryset.filter(geometry__intersects=boundary_geom)
                spatial_filter_applied = True
            except Exception as e:
                logger.warning(f"Spatial filter failed: {e}")
                if property_q: queryset = queryset.filter(property_q)
        elif property_q:
            queryset = queryset.filter(property_q)
            
        # Optimize aggregation using DB Area calculation where possible
        queryset = queryset.annotate(
            db_area=Cast(Area(Transform('geometry', 32643)), FloatField()) / 1000000.0
        )
        
        items, data = queryset.values('id', 'name', 'properties', 'db_area'), {}
        for obj in items:
            props = obj.get('properties', {})
            if layer_type == 'aquifer': 
                cat_name = props.get('Aquifer') or props.get('aquifer') or props.get('AQUIFER') or props.get('Aquifer_Type') or obj.get('name') or 'Unknown'
            elif layer_type == 'groundwater_zone':
                cat_name = props.get('Category') or props.get('block_status') or props.get('BLOCK_STAT') or props.get('GWDL') or props.get('BLOCK_STATUS') or props.get('category') or 'Unknown'
                cat_name = _normalize_category(cat_name)
            else: 
                cat_name = obj.get('name') or 'Other'
            
            area_val = obj.get('db_area') or 0
            # Fallback to properties Area if geometry area calculation failed (e.g. invalid geom)
            if area_val <= 0:
                try: area_val = float(props.get('Area') or props.get('AREA') or props.get('AREA_SQ_KM') or props.get('Area_SqKm') or props.get('Shape_Area') or 0)
                except: area_val = 0
                
            if cat_name not in data: data[cat_name] = {'count': 0, 'area': 0.0}
            data[cat_name]['count'] += 1
            data[cat_name]['area'] += area_val
            
        result = sorted([{'name': name, 'count': s['count'], 'area': round(s['area'], 2)} for name, s in data.items()], key=lambda x: x['area'] if sum(s['area'] for s in data.values()) > 0 else x['count'], reverse=True)
        return Response({'layer_type': layer_type, 'district': district or None, 'spatial_filter_applied': spatial_filter_applied, 'total_count': sum(s['count'] for s in data.values()), 'total_area': round(sum(s['area'] for s in data.values()), 2), 'distribution': result})

    @action(detail=False, methods=['get'])
    def intersect(self, request):
        layer_type = request.query_params.get('layer_type', 'aquifer')
        district = request.query_params.get('district', '').strip()
        block = request.query_params.get('block', '').strip()
        gp = request.query_params.get('grampanchayat', '').strip() or request.query_params.get('gp', '').strip()
        village = request.query_params.get('village', '').strip()
        
        try: tolerance = float(request.query_params.get('simplify', 0.0005))
        except: tolerance = 0.0005
        
        # Implementation of caching for computationally expensive spatial intersections
        cache_key = build_cache_key(f"intersect_{layer_type}_{tolerance}", request)
        cached = cache.get(cache_key)
        if cached: return Response(cached)
        
        queryset = SpatialLayer.objects.filter(layer_type=layer_type)
        boundary_geom = _get_boundary_geometry(district=district or None, block=block or None, grampanchayat=gp or None, village=village or None)
        
        # We want to match features that are EITHER spatially inside OR match the admin properties
        # This ensures consistency even if GIS shapes are slightly misaligned.
        property_q = Q()
        if district:
            dist_q = Q(properties__District__iexact=district) | Q(properties__DISTRICT__iexact=district) | \
                     Q(properties__New_Dist__iexact=district) | Q(properties__DIST_NAME__iexact=district) | \
                     Q(properties__dist_name__iexact=district) | Q(properties__DISTRICT_N__iexact=district)
            property_q &= dist_q
        if block:
            block_q = Q(properties__Block__iexact=block) | Q(properties__BLOCK__iexact=block) | \
                       Q(properties__block_name__iexact=block) | Q(properties__BLOCK_NAME__iexact=block) | \
                       Q(properties__Block_Name__iexact=block)
            property_q &= block_q
        if gp:
            gp_prop_q = Q(properties__Gram_Panchayat__iexact=gp) | Q(properties__GP_NAME__iexact=gp) | \
                        Q(properties__gram_panchayat__iexact=gp) | Q(properties__GRAM_PANCHAYAT__iexact=gp)
            property_q &= gp_prop_q
        if village:
            vlg_prop_q = Q(properties__Village__iexact=village) | Q(properties__VILLAGE__iexact=village) | \
                         Q(properties__village_name__iexact=village) | Q(properties__VILLAGE_NA__iexact=village)
            property_q &= vlg_prop_q

        has_spatial_results = False
        if boundary_geom and (block or gp or village):
            try:
                # Use spatial intersection for Block level and below 
                # This is crucial for linear features (canals) or polygons (waterbodies) 
                # that might lack property-based block attribution.
                queryset = queryset.filter(geometry__intersects=boundary_geom)
                
                # Only clip geometrically if at GP/Village level to save CPU
                if gp or village:
                    queryset = queryset.annotate(raw_geom=Intersection('geometry', boundary_geom))
                else:
                    queryset = queryset.annotate(raw_geom=F('geometry'))
                has_spatial_results = True
            except Exception as e:
                logger.warning(f"Spatial intersection failed for {layer_type}: {e}")
                if property_q: queryset = queryset.filter(property_q)
                queryset = queryset.annotate(raw_geom=F('geometry'))
        elif property_q:
            # For District/Block levels, property-based filtering is much faster 
            # and sufficient for thematic map display.
            queryset = queryset.filter(property_q)
            queryset = queryset.annotate(raw_geom=F('geometry'))
        elif boundary_geom:
            # Fallback to spatial filter for larger areas if no property filters exist
            queryset = queryset.filter(geometry__intersects=boundary_geom)
            queryset = queryset.annotate(raw_geom=F('geometry'))
            has_spatial_results = True
        else:
            # Default fallback
            queryset = queryset.annotate(raw_geom=F('geometry'))

        if tolerance > 0:
            queryset = queryset.annotate(display_geometry=Simplify('raw_geom', tolerance))
        else:
            queryset = queryset.annotate(display_geometry=F('raw_geom'))

        features = []
        # Use values() to avoid model instantiation overhead for large geojson payloads
        items = queryset.values('id', 'name', 'properties', 'layer_type', 'display_geometry')
        for item in items:
            geometry = item.get('display_geometry')
            if geometry:
                try:
                    if geometry.empty: continue
                    props = {**(item.get('properties') or {})}
                    
                    # Ensure Category is always injected and normalized for consistent styling
                    status_val = props.get('Category') or props.get('block_status') or props.get('BLOCK_STAT') or props.get('GWDL') or props.get('BLOCK_STATUS') or props.get('category')
                    props['Category'] = _normalize_category(status_val or 'Unknown')
                        
                    features.append({
                        "type": "Feature", 
                        "id": item['id'], 
                        "properties": {"name": item['name'] or props.get('AQUIFER') or props.get('Aquifer'), "layer_type": item['layer_type'], **props}, 
                        "geometry": json.loads(geometry.geojson)
                    })
                except: pass
        
        result = {
            "type": "FeatureCollection", 
            "boundary_filter": {
                "district": district or None, 
                "block": block or None, 
                "gp": gp or None,
                "village": village or None,
                "spatial_intersection": has_spatial_results
            }, 
            "feature_count": len(features), 
            "features": features
        }
        
        # Cache results for 30 minutes to improve reuse
        cache.set(cache_key, result, 1800)
        return Response(result)
