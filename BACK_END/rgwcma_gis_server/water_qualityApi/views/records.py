from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q

from ..models import WaterQuality
from ..serializers import WaterQualitySerializer, WaterQualityListSerializer, WaterQualityMapSerializer
from ..utils import calculate_wqi, check_quality_status, calculate_water_quality_stats

from core.filters import HierarchicalLocationFilterBackend
from core.services.cache_utils import build_cache_key
from django.core.cache import cache
from django.db import connection

from ..services import CorrelationService

class WaterQualityViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for Water Quality records with optimized filtering and performance.
    """
    queryset = WaterQuality.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = ['type_of_well', 'meta_date']
    search_fields = ['well_id', 'village__name']
    ordering_fields = ['meta_date', 'ph', 'tds', 'well_id']
    ordering = ['-meta_date']

    def get_serializer_class(self):
        if self.action == 'list':
            if self.request.query_params.get('map_markers') == 'true':
                return WaterQualityMapSerializer
            if self.request.query_params.get('detailed') == 'true':
                return WaterQualitySerializer
            return WaterQualityListSerializer
        return WaterQualitySerializer

    def list(self, request, *args, **kwargs):
        # 1. Optimize List Fetching with Caching
        cache_key = build_cache_key("wq_list", request)
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)
        
        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            cache.set(cache_key, response.data, 3600)
        return response

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('map_markers') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if self.request.query_params.get('map_markers') == 'true':
                return queryset.select_related('village').only('id', 'well_id', 'latitude', 'longitude', 'village__name', 'ph', 'tds')
            return queryset.select_related('village__grampanchayat__block__district__state')
        if self.action == 'retrieve':
            return queryset.select_related('village__grampanchayat__block__district__state')
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        cache_key = build_cache_key("wq_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        summary = calculate_water_quality_stats(queryset, WaterQuality)
        wqi_data = calculate_wqi(summary)
        quality_status = check_quality_status(summary)
        well_types = queryset.values('type_of_well').annotate(count=Count('id')).order_by('-count')
        
        # Add dashboard correlations
        correlations = CorrelationService.get_dashboard_correlations(queryset)
        
        res = {
            'summary': summary, 
            'wqi': wqi_data, 
            'status': quality_status, 
            'well_type_distribution': list(well_types),
            'correlations': correlations
        }
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'])
    def availability_statistics(self, request):
        cache_key = build_cache_key("wq_availability_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        pre_filter, post_filter = Q(meta_date__month__in=[5, 6]), Q(meta_date__month__in=[10, 11])
        agg_params = {
            'total_records': Count('id'),
            'avg_pre_ph': Avg('ph', filter=pre_filter), 'avg_post_ph': Avg('ph', filter=post_filter),
            'avg_pre_tds': Avg('tds', filter=pre_filter), 'avg_post_tds': Avg('tds', filter=post_filter),
            'avg_pre_hardness': Avg('hardness', filter=pre_filter), 'avg_post_hardness': Avg('hardness', filter=post_filter),
            'avg_pre_alkalinity': Avg('alkalinity', filter=pre_filter), 'avg_post_alkalinity': Avg('alkalinity', filter=post_filter),
            'avg_pre_nitrate': Avg('nitrate', filter=pre_filter), 'avg_post_nitrate': Avg('nitrate', filter=post_filter),
            'avg_pre_fluoride': Avg('fluoride', filter=pre_filter), 'avg_post_fluoride': Avg('fluoride', filter=post_filter),
        }
        stats = queryset.aggregate(**agg_params)
        summary = {k: (round(v or 0, 2) if k.startswith('avg_') else (v or 0)) for k, v in stats.items()}
        res = {'summary': summary}
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        level = request.query_params.get('level', 'district')
        cache_key = build_cache_key(f"wq_by_loc_{level}", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        if level == 'district':
            data = queryset.values('village__grampanchayat__block__district__name').annotate(count=Count('id'), avg_ph=Avg('ph'), avg_tds=Avg('tds')).order_by('-count')
            res = {'level': 'district', 'data': list(data)}
        elif level == 'block':
            data = queryset.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name').annotate(count=Count('id'), avg_ph=Avg('ph'), avg_tds=Avg('tds')).order_by('-count')
            res = {'level': 'block', 'data': list(data)}
        else: return Response({'error': 'Invalid level parameter. Use "district" or "block".'}, status=status.HTTP_400_BAD_REQUEST)
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'], url_path='correlation-matrix')
    def correlation_matrix(self, request):
        cache_key = build_cache_key("wq_corr_matrix", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        result = CorrelationService.get_correlation_matrix_data(
            request, 
            self.filter_queryset, 
            self.get_queryset
        )
        if result and 'error' not in result:
            cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def correlation(self, request):
        cache_key = build_cache_key("wq_corr_single", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        result = CorrelationService.get_correlation_data(
            request, 
            self.filter_queryset, 
            self.get_queryset
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']}, 
                status=result.get('status', status.HTTP_500_INTERNAL_SERVER_ERROR)
            )
            
        cache.set(cache_key, result, 3600)
        return Response(result)
