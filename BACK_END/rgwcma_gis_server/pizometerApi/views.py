from rest_framework import viewsets, filters, permissions
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Piezometer
from .serializers import PiezometerSerializer
from core.filters import HierarchicalLocationFilterBackend

from django.db.models import Avg, Count, Max, Min
from django.core.cache import cache
from rest_framework.decorators import action
from rest_framework.response import Response

class PiezometerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Piezometer data with optimized filtering and performance.
    """
    queryset = Piezometer.objects.all()
    serializer_class = PiezometerSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = {
        'date': ['exact', 'gte', 'lte'],
    }
    search_fields = ['piezometer_name', 'village__name']
    ordering_fields = ['date', 'water_level_depth']
    ordering = ['-date']

    def get_queryset(self):
        """
        Location filtering now handled by HierarchicalLocationFilterBackend.
        """
        queryset = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Aggregation for Piezometer data with caching."""
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        param_str = '_'.join(loc_params) if loc_params else 'all'
        
        # Ensure cache key isn't too long for backends like memcached
        if len(param_str) > 150:
            import hashlib
            param_str = hashlib.md5(param_str.encode()).hexdigest()
            
        cache_key = f"piezometer_stats_{param_str}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset())
        
        stats = queryset.aggregate(
            total_count=Count('id'),
            avg_depth=Avg('water_level_depth'),
            max_depth=Max('water_level_depth'),
            min_depth=Min('water_level_depth')
        )

        res = {
            'total_count': stats['total_count'] or 0,
            'avg_depth': round(stats['avg_depth'] or 0, 2),
            'max_depth': round(stats['max_depth'] or 0, 2),
            'min_depth': round(stats['min_depth'] or 0, 2),
        }
        cache.set(cache_key, res, 3600)
        return Response(res)
