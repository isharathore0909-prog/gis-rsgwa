import logging
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from django.db.models import Q

from ..models import SpatialLayer
from ..serializers import SpatialLayerSerializer
from core.spatial_utils import normalize_geometry_crs
from core.services.cache_utils import build_cache_key
from django.db.models import Sum, Count, F, Value, CharField
from django.db.models.functions import Coalesce
from django.db.models.fields.json import KeyTextTransform

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

    def _apply_filters(self, queryset, request):
        layer_type = request.query_params.get('layer_type', 'aquifer')
        district = request.query_params.get('district', '').strip()
        block = request.query_params.get('block', '').strip()
        gp = request.query_params.get('grampanchayat', '').strip() or request.query_params.get('gp', '').strip()
        village = request.query_params.get('village', '').strip()
        
        queryset = queryset.filter(layer_type=layer_type)
        
        property_q = Q()
        if district:
            dist_q = Q(properties__District__iexact=district) | Q(properties__DISTRICT__iexact=district) | \
                     Q(properties__New_Dist__iexact=district) | Q(properties__DIST_NAME__iexact=district) | \
                     Q(properties__dist_name__iexact=district) | Q(properties__DISTRICT_N__iexact=district) | \
                     Q(properties__DISTRICT_N_2__iexact=district) | Q(properties__DIVISION_N__iexact=district)
            property_q &= dist_q
        if block:
            block_q = Q(properties__Block__iexact=block) | Q(properties__BLOCK__iexact=block) | \
                      Q(properties__block_name__iexact=block) | Q(properties__BLOCK_NAME__iexact=block) | \
                      Q(properties__Block_Name__iexact=block) | Q(properties__BLOCK_NAME_2__iexact=block)
            property_q &= block_q
        if gp:
            gp_q = Q(properties__Grampanchyat__iexact=gp) | Q(properties__GRAMPANCHAYAT__iexact=gp) | \
                   Q(properties__gp_name__iexact=gp) | Q(properties__GP_NAME__iexact=gp) | \
                   Q(properties__GP_FINAL__iexact=gp) | Q(properties__GP_Name__iexact=gp)
            property_q &= gp_q
        if village:
            vlg_q = Q(properties__Village__iexact=village) | Q(properties__VILLAGE__iexact=village) | \
                    Q(properties__village_name__iexact=village) | Q(properties__VILLAGE_NA__iexact=village) | \
                    Q(properties__VILLAGE_NM__iexact=village) | Q(properties__VILLAGE_NM_2__iexact=village)
            property_q &= vlg_q

        spatial_filter_applied, boundary_geom = False, _get_boundary_geometry(district=district or None, block=block or None, grampanchayat=gp or None, village=village or None)
        
        if property_q:
            p_queryset = queryset.filter(property_q)
            if p_queryset.exists():
                queryset = p_queryset
            elif boundary_geom:
                queryset = queryset.filter(geometry__intersects=boundary_geom)
                spatial_filter_applied = True
        elif boundary_geom:
            queryset = queryset.filter(geometry__intersects=boundary_geom)
            spatial_filter_applied = True
            
        return queryset, spatial_filter_applied, district

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        cache_key = build_cache_key("spatial_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)

        queryset, spatial_filter_applied, district = self._apply_filters(self.queryset, request)
        layer_type = request.query_params.get('layer_type', 'aquifer')
        queryset = queryset.filter(area_sqkm__isnull=False)

        if queryset.count() > 5000:
            if layer_type == 'aquifer':
                aggregation = queryset.annotate(
                    cat=Coalesce(
                        KeyTextTransform('Aquifer', 'properties'),
                        KeyTextTransform('aquifer', 'properties'),
                        KeyTextTransform('AQUIFER', 'properties'),
                        Value('Other'),
                        output_field=CharField()
                    )
                ).values('cat').annotate(
                    total_area=Sum('area_sqkm'),
                    total_count=Count('id')
                ).order_by('-total_area')
                
                result = [{'name': str(item['cat']), 'count': item['total_count'], 'area': round(item['total_area'], 2)} for item in aggregation]
                res = {
                    'layer_type': layer_type, 
                    'district': district or None, 
                    'spatial_filter_applied': spatial_filter_applied, 
                    'total_count': sum(r['count'] for r in result), 
                    'total_area': round(sum(r['area'] for r in result), 2), 
                    'distribution': result
                }
                cache.set(cache_key, res, 1800) # 30 min cache
                return Response(res)
        
        items, data = queryset.values('id', 'name', 'properties', 'area_sqkm'), {}
        for obj in items:
            props = obj.get('properties', {})
            if layer_type == 'aquifer': 
                cat_name = props.get('Aquifer') or props.get('aquifer') or props.get('AQUIFER') or props.get('Aquifer_Type') or obj.get('name') or 'Unknown'
            elif layer_type == 'groundwater_zone':
                cat_name = props.get('Category') or props.get('block_status') or props.get('BLOCK_STAT') or props.get('GWDL') or props.get('BLOCK_STATUS') or props.get('category') or 'Unknown'
                cat_name = _normalize_category(cat_name)
            else: 
                cat_name = obj.get('name') or 'Other'
            
            area_val = obj.get('area_sqkm') or 0
            if cat_name not in data: data[cat_name] = {'count': 0, 'area': 0.0}
            data[cat_name]['count'] += 1
            data[cat_name]['area'] += area_val
            
        result = sorted([{'name': name, 'count': s['count'], 'area': round(s['area'], 2)} for name, s in data.items()], key=lambda x: x['area'] if sum(s['area'] for s in data.values()) > 0 else x['count'], reverse=True)
        res = {'layer_type': layer_type, 'district': district or None, 'spatial_filter_applied': spatial_filter_applied, 'total_count': sum(s['count'] for s in data.values()), 'total_area': round(sum(s['area'] for s in data.values()), 2), 'distribution': result}
        cache.set(cache_key, res, 1800)
        return Response(res)

    @action(detail=False, methods=['get'])
    def intersect(self, request):
        """Standardized intersect endpoint to return features matching administrative boundaries."""
        cache_key = build_cache_key("spatial_intersect", request)
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)

        queryset, spatial_filter_applied, _ = self._apply_filters(self.queryset, request)
        # Limit features to 1000 for performance
        queryset = queryset[:1000]
        serializer = self.get_serializer(queryset, many=True)
        res = {
            "type": "FeatureCollection",
            "spatial_filter_applied": spatial_filter_applied,
            "features": serializer.data
        }
        cache.set(cache_key, res, 1800)
        return Response(res)
