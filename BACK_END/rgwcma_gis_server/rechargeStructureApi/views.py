from django.db.models import Count, Sum, Q, F, Case, When, Value
from django.db.models.functions import Upper, Trim, Coalesce
from rest_framework import viewsets, filters, permissions
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import RechargeStructure
from .serializers import RechargeStructureSerializer
from locationApi.models import Village

from core.filters import HierarchicalLocationFilterBackend

from django.core.cache import cache


def _invalidate_recharge_cache():
    """Clear all recharge stats cache keys."""
    try:
        cache.delete_pattern("recharge_stats_*")
    except Exception:
        # delete_pattern may not be available in all cache backends
        # Fall back to deleting known keys – acceptable since TTL is short
        pass


class RechargeStructureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Water Recharge Structures with optimized filtering and performance.
    """
    queryset = RechargeStructure.objects.all()
    serializer_class = RechargeStructureSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend,
        HierarchicalLocationFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_fields = ['village', 'structure_type']
    search_fields = ['structure_type', 'other_recharge_structures', 'village__name']
    ordering_fields = ['storage_capacity', 'created_at']

    def get_queryset(self):
        """
        Location filtering now handled by HierarchicalLocationFilterBackend.
        """
        queryset = super().get_queryset()

        # Optimization: Fetch related administrative names in a single query
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')

        return queryset

    # -----------------------------------------------------------------
    # Invalidate cache whenever data changes
    # -----------------------------------------------------------------
    def perform_create(self, serializer):
        super().perform_create(serializer)
        _invalidate_recharge_cache()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        _invalidate_recharge_cache()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        _invalidate_recharge_cache()

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Optimized statistical analysis using database grouping and caching."""
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"recharge_stats_{'_'.join(loc_params) if loc_params else 'all'}"
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset())

        # Determine the display label for each record:
        # - If structure_type is blank / 'Other' / 'Others', use other_recharge_structures
        # - Otherwise use structure_type itself
        OTHER_TYPES = ['other', 'others', 'other recharge structures']

        stats_queryset = queryset.annotate(
            raw_type=Trim(Coalesce(F('structure_type'), Value(''))),
        ).annotate(
            display_type=Case(
                When(
                    Q(raw_type='') | Q(structure_type__isnull=True),
                    then=Coalesce(Trim(F('other_recharge_structures')), Value('Unspecified'))
                ),
                When(
                    structure_type__iregex=r'^others?$',
                    then=Coalesce(Trim(F('other_recharge_structures')), Value('Other'))
                ),
                default=Trim(F('structure_type')),
            )
        ).values('display_type').annotate(
            count=Count('id'),
            total_capacity=Sum('storage_capacity')
        ).order_by('-count')

        total_stats = queryset.aggregate(
            total_count=Count('id'),
            total_capacity=Sum('storage_capacity')
        )

        res = {
            'total_count': total_stats['total_count'],
            'total_capacity': round(total_stats['total_capacity'] or 0, 2),
            'by_type': [
                {
                    'type': (item['display_type'] or 'Unspecified').strip() or 'Unspecified',
                    'count': item['count'],
                    'capacity': round(item['total_capacity'] or 0, 2)
                } for item in stats_queryset
            ]
        }
        # Short TTL (5 min) so newly added records appear quickly
        cache.set(cache_key, res, 300)
        return Response(res)
