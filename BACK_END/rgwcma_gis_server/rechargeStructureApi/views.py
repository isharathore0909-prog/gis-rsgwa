from django.db.models import Count, Sum, Q, F, Case, When
from rest_framework import viewsets, filters, permissions
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import RechargeStructure
from .serializers import RechargeStructureSerializer
from locationApi.models import Village

from core.filters import HierarchicalLocationFilterBackend

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

    location_filters = {
        'state': 'village__grampanchayat__block__district__state__name__iexact',
        'block': 'village__grampanchayat__block__name__iexact',
        'grampanchayat': 'village__grampanchayat__name__iexact',
        'village_name': 'village__name__iexact',
        'village_id': 'village_id',
    }

    def get_queryset(self):
        """
        Location filtering now partially handled by HierarchicalLocationFilterBackend.
        Manual District handling preserved for datasets with specific spelling variants.
        """
        queryset = super().get_queryset()
        params = self.request.query_params
        
        # 2. Manual District handling (due to specific spelling variants in this dataset)
        district = params.get('district')
        if district:
            district_name = district.strip()
            # Common spelling variants check
            q_obj = Q(village__grampanchayat__block__district__name__icontains=district_name)
            if district_name.lower() in ['dhaulpur', 'dholpur']:
                q_obj |= Q(village__grampanchayat__block__district__name__icontains='Dholpur')
                q_obj |= Q(village__grampanchayat__block__district__name__icontains='Dhaulpur')
            queryset = queryset.filter(q_obj)
        
        # Optimization: Fetch related administrative names in a single query
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')
            
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Optimized statistical analysis using database grouping."""
        queryset = self.get_queryset()
        
        # Group by structure_type but fallback to other_recharge_structures if generic
        stats_queryset = queryset.annotate(
            display_type=Case(
                When(structure_type__in=['Other', 'Others', None], then=F('other_recharge_structures')),
                default=F('structure_type'),
            )
        ).values('display_type').annotate(
            count=Count('id'),
            total_capacity=Sum('storage_capacity')
        ).order_by('-count')

        total_stats = queryset.aggregate(
            total_count=Count('id'),
            total_capacity=Sum('storage_capacity')
        )
        
        return Response({
            'total_count': total_stats['total_count'],
            'total_capacity': round(total_stats['total_capacity'] or 0, 2),
            'by_type': [
                {
                    'type': (item['display_type'] or 'Unspecified').strip() or 'Other',
                    'count': item['count'],
                    'capacity': round(item['total_capacity'] or 0, 2)
                } for item in stats_queryset
            ]
        })

