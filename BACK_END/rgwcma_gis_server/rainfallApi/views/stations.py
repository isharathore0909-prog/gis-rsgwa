from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Sum, Avg, Count
from django.core.cache import cache

from ..models import RainfallStation, StationRainfall
from ..serializers import RainfallStationSerializer, StationRainfallSerializer
from core.filters import HierarchicalLocationFilterBackend
from core.services.cache_utils import build_cache_key
from ..utils import calculate_rainfall_stats, calculate_rainfall_summary

class StationRainfallViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for daily station rainfall data with optimized performance.
    """
    queryset = StationRainfall.objects.all()
    serializer_class = StationRainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    filter_backends = [HierarchicalLocationFilterBackend]
    
    location_filters = {
        'district': 'station__district__iexact',
        'station_district': 'station__district__iexact',
        'block': 'station__block__iexact', # Not in model, but for completeness
        'station_id': 'station_id',
        'station_name': 'station__name__iexact',
        'station_ids': 'station_id__in',
    }
    
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        
        # 1. Date Filtering
        if params.get('start_date'):
            queryset = queryset.filter(date__gte=params.get('start_date'))
        if params.get('end_date'):
            queryset = queryset.filter(date__lte=params.get('end_date'))

        # 2. Administrative Filtering (Spatially resolved fallback)
        # ONLY apply this if no explicit station IDs are provided, 
        # allowing the frontend to fall back to nearest stations if it chooses.
        block = params.get('block')
        block_id = params.get('block_id')
        gp = params.get('gram_panchayat') or params.get('grampanchayat')
        gp_id = params.get('gp_id')
        
        has_specific_station = params.get('station_id') or params.get('station_name') or params.get('station_ids')
        
        if (block or block_id or gp or gp_id) and not has_specific_station:
            from locationApi.models import Block, Grampanchayat
            target_geom = None
            try:
                if gp_id: target_geom = Grampanchayat.objects.filter(id=gp_id).first()
                elif gp: target_geom = Grampanchayat.objects.filter(name__iexact=gp).first()
                elif block_id: target_geom = Block.objects.filter(id=block_id).first()
                elif block: target_geom = Block.objects.filter(name__iexact=block).first()
                
                if target_geom and target_geom.geometry:
                    extent = target_geom.geometry.extent
                    # Filter stations by bounding box of the selected boundary
                    station_ids = RainfallStation.objects.filter(
                        longitude__range=(extent[0], extent[2]),
                        latitude__range=(extent[1], extent[3])
                    ).values_list('id', flat=True)
                    queryset = queryset.filter(station_id__in=station_ids)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Spatial filtration failed: {e}")

        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('station')
        return queryset

    @action(detail=False, methods=['get'])
    def stations(self, request):
        stations = RainfallStation.objects.all()
        district = request.query_params.get('district')
        if district:
            stations = stations.filter(district__iexact=district)
        serializer = RainfallStationSerializer(stations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        cache_key = build_cache_key("station_rainfall_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        result = calculate_rainfall_stats(queryset, is_station_data=True)
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        timestep = request.query_params.get('timestep', 'daily').lower()
        cache_key = build_cache_key("station_rainfall_summary", request, extra=timestep)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        result = calculate_rainfall_summary(queryset, timestep=timestep, is_station_data=True)
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        cache_key = build_cache_key("station_rainfall_district_wise", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        data = queryset.values('station__district') \
                       .annotate(average_rainfall=Avg('rainfall_mm'), 
                                total_rainfall=Sum('rainfall_mm'),
                                record_count=Count('id')) \
                       .order_by('station__district')
        result = [
            {
                'district': d['station__district'],
                'average_rainfall': round(d['average_rainfall'] or 0, 2),
                'total_rainfall': round(d['total_rainfall'] or 0, 2),
                'record_count': d['record_count']
            }
            for d in data if d['station__district']
        ]
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def location_wise(self, request):
        level = request.query_params.get('level', 'district').lower()
        cache_key = build_cache_key("station_rainfall_location_wise", request, extra=level)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        if level == 'district': group_field = 'station__district'
        elif level == 'station': group_field = 'station__name'
        else: return Response([])
        data = queryset.values(group_field).annotate(average_rainfall=Avg('rainfall_mm')).order_by(group_field)
        result = [{'location': d[group_field], 'average_rainfall': round(d['average_rainfall'] or 0, 2)} for d in data if d[group_field]]
        cache.set(cache_key, result, 3600)
        return Response(result)
