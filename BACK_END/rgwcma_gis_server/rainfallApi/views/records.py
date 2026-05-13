import logging
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Sum, Avg, Count, Max, Min
from django.db.models.functions import TruncMonth, TruncYear
from django.core.cache import cache

from ..models import Rainfall
from ..serializers import RainfallSerializer
from core.geo_utils import spatial_nearby
from core.filters import HierarchicalLocationFilterBackend
from core.services.cache_utils import build_cache_key
from ..utils import calculate_rainfall_stats, calculate_rainfall_summary

logger = logging.getLogger(__name__)

class RainfallViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing rainfall records with optimized performance.
    """
    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    filter_backends = [HierarchicalLocationFilterBackend]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get('start_date'):
            queryset = queryset.filter(date__gte=params.get('start_date'))
        if params.get('end_date'):
            queryset = queryset.filter(date__lte=params.get('end_date'))
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        cache_key = build_cache_key("rainfall_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        result = calculate_rainfall_stats(queryset, is_station_data=False)
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        timestep = request.query_params.get('timestep', 'daily').lower()
        cache_key = build_cache_key("rainfall_summary", request, extra=timestep)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        result = calculate_rainfall_summary(queryset, timestep=timestep, is_station_data=False)
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        cache_key = build_cache_key("rainfall_district_wise", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        data = queryset.values('village__grampanchayat__block__district__name') \
                       .annotate(average_rainfall=Avg('rainfall_mm')) \
                       .order_by('village__grampanchayat__block__district__name')
        result = [
            {'district': d['village__grampanchayat__block__district__name'], 'average_rainfall': round(d['average_rainfall'] or 0, 2)}
            for d in data if d['village__grampanchayat__block__district__name']
        ]
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def location_wise(self, request):
        level = request.query_params.get('level', 'district').lower()
        cache_key = build_cache_key("rainfall_location_wise", request, extra=level)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        if level == 'district': group_field = 'village__grampanchayat__block__district__name'
        elif level == 'block': group_field = 'village__grampanchayat__block__name'
        elif level == 'gp' or level in ['grampanchayat', 'gram_panchayat']: group_field = 'village__grampanchayat__name'
        elif level == 'village': group_field = 'village__name'
        else: return Response({'error': 'Invalid aggregation level'}, status=status.HTTP_400_BAD_REQUEST)
        data = queryset.values(group_field).annotate(
            total_rainfall=Sum('rainfall_mm'),
            unit_count=Count('village_id', distinct=True)
        ).order_by(group_field)
        
        result = [
            {
                'location': d[group_field], 
                'average_rainfall': round((d['total_rainfall'] / d['unit_count']) if d['unit_count'] > 0 else 0, 2)
            } 
            for d in data if d[group_field]
        ]
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        cache_key = build_cache_key("rainfall_nearby", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        params = request.query_params
        lat_val = params.get('lat') or params.get('latitude')
        lon_val = params.get('lon') or params.get('longitude')
        radius_val = params.get('radius_km') or params.get('radius') or 10
        gram_panchayat = params.get('gram_panchayat')
        try:
            lat, lon = float(lat_val), float(lon_val)
        except (TypeError, ValueError):
            return Response({'error': 'Valid lat and lon parameters are required'}, status=status.HTTP_400_BAD_REQUEST)
        try: radius_km = float(radius_val)
        except (TypeError, ValueError): radius_km = 10
        queryset = self.get_queryset()
        nearby_records = spatial_nearby(queryset, lat, lon, radius_km)
        if gram_panchayat: nearby_records = nearby_records.filter(village__grampanchayat__name__iexact=gram_panchayat)
        nearby_records = nearby_records.select_related('village')
        if not nearby_records.exists():
            return Response({'message': 'No rainfall data found nearby', 'count': 0, 'stats': None, 'summary': []})
        stats = nearby_records.aggregate(total=Sum('rainfall_mm'), avg=Avg('rainfall_mm'), count=Count('id'), max=Max('rainfall_mm'), min=Min('rainfall_mm'))
        max_val, max_info = stats.get('max'), {}
        if max_val:
            max_record = nearby_records.filter(rainfall_mm=max_val).first()
            if max_record: max_info = {'village': max_record.village.name, 'date': max_record.date}
        timestep = request.query_params.get('timestep', 'monthly').lower()
        if timestep == 'monthly':
            summary_data = nearby_records.annotate(month=TruncMonth('date')).values('month').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('month')
            summary = [{'name': d['month'].strftime('%Y-%m') if d['month'] else 'Unknown', 'total': round(d['total'] or 0, 2), 'average': round(d['average'] or 0, 2)} for d in summary_data]
        elif timestep == 'yearly':
            summary_data = nearby_records.annotate(year=TruncYear('date')).values('year').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('year')
            summary = [{'name': d['year'].strftime('%Y') if d['year'] else 'Unknown', 'total': round(d['total'] or 0, 2), 'average': round(d['average'] or 0, 2)} for d in summary_data]
        else: # daily
            summary_data = nearby_records.values('date').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('date')
            summary = [{'name': str(d['date']), 'total': round(d['total'] or 0, 2), 'average': round(d['average'] or 0, 2)} for d in summary_data]
        result = {'location': {'lat': lat, 'lon': lon}, 'radius_km': radius_km, 'gram_panchayat': gram_panchayat, 'count': stats['count'], 'stats': {'total': round(stats['total'] or 0, 2), 'avg': round(stats['avg'] or 0, 2), 'max': round(stats['max'] or 0, 2), 'min': round(stats['min'] or 0, 2), 'max_village': max_info.get('village'), 'max_date': max_info.get('date')}, 'summary': summary}
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def distribution(self, request):
        """
        Categorized distribution of rainfall (Excess, Normal, etc.) by location.
        """
        cache_key = build_cache_key("rainfall_distribution", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        
        queryset = self.filter_queryset(self.get_queryset())
        from ..utils import calculate_rainfall_distribution
        normal = request.query_params.get('normal')
        if normal:
            try: normal = float(normal)
            except: normal = None
            
        result = calculate_rainfall_distribution(queryset, normal_avg=normal, is_station_data=False)
        
        cache.set(cache_key, result, 3600)
        return Response(result)
