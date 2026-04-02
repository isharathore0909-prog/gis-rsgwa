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

logger = logging.getLogger(__name__)

def _get_boundary_geometry(district=None, block=None, grampanchayat=None):
    try:
        from locationApi.models import District as DistrictModel, Block as BlockModel, Grampanchayat as GrampanchayatModel
        if grampanchayat and block and district:
            gp = GrampanchayatModel.objects.filter(Q(name__iexact=grampanchayat), block__name__iexact=block, block__district__name__iexact=district).exclude(geometry__isnull=True).first()
            if gp and gp.geometry: return normalize_geometry_crs(gp.geometry)
        if block and district:
            blk = BlockModel.objects.filter(Q(name__iexact=block), district__name__iexact=district).exclude(geometry__isnull=True).first()
            if blk and blk.geometry: return normalize_geometry_crs(blk.geometry)
        if district:
            dist = DistrictModel.objects.filter(name__iexact=district).exclude(geometry__isnull=True).first()
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
        cache_key = build_cache_key("layers_fc", request)
        cached = cache.get(cache_key)
        if cached: return Response(cached)
        queryset = self.filter_queryset(self.get_queryset())
        features = []
        for obj in queryset:
            geom_data = json.loads(obj.geometry.geojson) if obj.geometry else None
            features.append({"type": "Feature", "id": obj.id, "properties": {"name": obj.name, "layer_type": obj.layer_type, **obj.properties}, "geometry": geom_data})
        result = {"type": "FeatureCollection", "features": features}
        cache.set(cache_key, result, 1800)
        return Response(result)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        layer_type, district, block, gp = request.query_params.get('layer_type', 'aquifer'), request.query_params.get('district', '').strip(), request.query_params.get('block', '').strip(), (request.query_params.get('grampanchayat', '').strip() or request.query_params.get('gp', '').strip())
        queryset = SpatialLayer.objects.filter(layer_type=layer_type)
        spatial_filter_applied, boundary_geom = False, _get_boundary_geometry(district=district or None, block=block or None, grampanchayat=gp or None)
        if boundary_geom:
            try:
                if queryset.filter(geometry__intersects=boundary_geom).exists():
                    queryset = queryset.filter(geometry__intersects=boundary_geom)
                    spatial_filter_applied = True
            except Exception as e: logger.warning(f"Spatial filter failed: {e}")
        if not spatial_filter_applied and district: queryset = queryset.filter(Q(properties__District__iexact=district) | Q(properties__DISTRICT__iexact=district) | Q(properties__New_Dist__iexact=district) | Q(properties__DIST_NAME__iexact=district) | Q(properties__dist_name__iexact=district))
        items, data = queryset.values('id', 'name', 'properties', 'geometry'), {}
        for obj in items:
            props = obj.get('properties', {})
            if layer_type == 'aquifer': cat_name = props.get('Aquifer') or props.get('aquifer') or props.get('AQUIFER') or props.get('Aquifer_Type') or obj.get('name') or 'Unknown'
            elif layer_type == 'groundwater_zone':
                cat_name = props.get('Category') or props.get('CATEGORY') or props.get('GWDL') or props.get('category') or 'Unknown'
                cat_lower = str(cat_name).lower().strip()
                if 'over' in cat_lower and 'exploited' in cat_lower: cat_name = 'Over Exploited'
                elif 'semi' in cat_lower: cat_name = 'Semi Critical'
                elif 'critical' in cat_lower: cat_name = 'Critical'
                elif 'safe' in cat_lower: cat_name = 'Safe'
                elif 'saline' in cat_lower: cat_name = 'Saline'
            else: cat_name = obj.get('name') or 'Other'
            area_val, geom = 0, obj.get('geometry')
            if geom and hasattr(geom, 'transform') and geom.srid:
                try:
                    c = geom.centroid
                    if c and (20 < c.y < 40) and (65 < c.x < 85):
                        area_val = geom.transform(32643, clone=True).area / 1_000_000
                except: pass
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
        layer_type, district, block, gp = request.query_params.get('layer_type', 'aquifer'), request.query_params.get('district', '').strip(), request.query_params.get('block', '').strip(), (request.query_params.get('grampanchayat', '').strip() or request.query_params.get('gp', '').strip())
        queryset = SpatialLayer.objects.filter(layer_type=layer_type)
        boundary_geom = _get_boundary_geometry(district=district or None, block=block or None, grampanchayat=gp or None)
        has_boundary = False
        if boundary_geom:
            try:
                if queryset.filter(geometry__intersects=boundary_geom).exists():
                    queryset = queryset.filter(geometry__intersects=boundary_geom).annotate(clipped_geometry=Intersection('geometry', boundary_geom))
                    has_boundary = True
            except: pass
        if not has_boundary and district: queryset = queryset.filter(Q(properties__District__iexact=district) | Q(properties__DISTRICT__iexact=district) | Q(properties__New_Dist__iexact=district) | Q(properties__DIST_NAME__iexact=district) | Q(properties__dist_name__iexact=district))
        features = []
        for obj in queryset:
            geometry = getattr(obj, 'clipped_geometry', obj.geometry)
            if geometry:
                try:
                    if geometry.empty: continue
                    features.append({"type": "Feature", "id": obj.id, "properties": {"name": obj.name, "layer_type": obj.layer_type, **obj.properties}, "geometry": json.loads(geometry.geojson)})
                except: pass
        return Response({"type": "FeatureCollection", "boundary_filter": {"district": district or None, "block": block or None, "grampanchayat": gp or None, "spatial_intersection": boundary_geom is not None}, "feature_count": len(features), "features": features})
