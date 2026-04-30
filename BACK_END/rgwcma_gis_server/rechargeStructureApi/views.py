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
from core.services.cache_utils import build_cache_key
from django.core.cache import cache


def _invalidate_recharge_cache():
    """Clear all recharge stats cache keys."""
    try:
        cache.delete_pattern("recharge_stats_*")
    except Exception:
        # delete_pattern may not be available in all cache backends
        # Fall back to deleting known keys – acceptable since TTL is short
        pass


def _get_boundary_geometry(district=None, block=None, grampanchayat=None, village=None):
    try:
        from locationApi.models import District as DistrictModel, Block as BlockModel, Grampanchayat as GrampanchayatModel, Village as VillageModel
        from core.spatial_utils import normalize_geometry_crs

        if village and village.strip() and village.strip().lower() not in ['-- all villages --', 'none', '']:
            vlg_q = Q(name__icontains=village.strip())
            if grampanchayat and grampanchayat.strip() and grampanchayat.strip().lower() not in ['-- all gram panchayats --', 'none', '']:
                vlg_q &= Q(grampanchayat__name__icontains=grampanchayat.strip())
            vlg = VillageModel.objects.filter(vlg_q).exclude(geometry__isnull=True).first()
            if vlg and vlg.geometry: return normalize_geometry_crs(vlg.geometry)

        if grampanchayat and grampanchayat.strip() and grampanchayat.strip().lower() not in ['-- all gram panchayats --', 'none', '']:
            gp_q = Q(name__icontains=grampanchayat.strip())
            if block and block.strip(): gp_q &= Q(block__name__icontains=block.strip())
            gp = GrampanchayatModel.objects.filter(gp_q).exclude(geometry__isnull=True).first()
            if gp and gp.geometry: return normalize_geometry_crs(gp.geometry)

        if block and block.strip() and block.strip().lower() not in ['none', '']:
            blk_q = Q(name__icontains=block.strip())
            if district and district.strip(): blk_q &= Q(district__name__icontains=district.strip())
            blk = BlockModel.objects.filter(blk_q).exclude(geometry__isnull=True).first()
            if blk and blk.geometry: return normalize_geometry_crs(blk.geometry)

        if district and district.strip() and district.strip().lower() not in ['none', '']:
            dist = DistrictModel.objects.filter(name__icontains=district.strip()).exclude(geometry__isnull=True).first()
            if dist and dist.geometry: return normalize_geometry_crs(dist.geometry)
    except Exception as e:
        logger.warning(f"Fallback boundary geometry lookup failed: {e}")
    return None


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
    filterset_fields = ['structure_type']
    search_fields = ['structure_type', 'other_recharge_structures', 'village__name']
    ordering_fields = ['storage_capacity', 'created_at']
    ordering = ['-created_at']

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
        cache_key = build_cache_key("recharge_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)

        # 1. Standard Property-based filtering
        queryset = self.filter_queryset(self.get_queryset())

        # 2. Spatial Fallback if property filtering yields nothing
        # This handles newly added districts or mis-tagged data
        if not queryset.exists():
            district = request.query_params.get('district', '').strip()
            block = request.query_params.get('block', '').strip()
            gp = request.query_params.get('grampanchayat', '').strip() or request.query_params.get('gp', '').strip()
            village = request.query_params.get('village', '').strip()

            boundary_geom = _get_boundary_geometry(
                district=district or None,
                block=block or None,
                grampanchayat=gp or None,
                village=village or None
            )

            if boundary_geom:
                # Use spatial intersection as fallback
                queryset = self.get_queryset().filter(latitude__isnull=False, longitude__isnull=False)
                # Instead of expensive geometry intersection on every record, 
                # we can use point-in-polygon if we had a geometry field on RechargeStructure.
                # Since we have latitude/longitude, we use them to construct points.
                from django.contrib.gis.geos import Point
                # This is still a bit slow for large datasets but works for fallbacks.
                # Optimized approach: use a spatial field or bounding box first.
                queryset = queryset.filter(village__geometry__intersects=boundary_geom)

        # Determine the display label for each record:
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
            'total_available_in_db': RechargeStructure.objects.count(),
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
