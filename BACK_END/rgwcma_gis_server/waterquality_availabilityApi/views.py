from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count

from .models import WaterQualityAvailability
from .serializers import WaterQualityAvailabilitySerializer
from core.filters import HierarchicalLocationFilterBackend

class WaterQualityAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = WaterQualityAvailability.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = ['type_of_well', 'village', 'well_id']
    search_fields = ['well_id', 'village__name']
    ordering_fields = ['well_id', 'pre_ph', 'post_ph', 'pre_tds', 'post_tds']
    ordering = ['well_id']

    def get_queryset(self):
        """
        Location filtering now handled by HierarchicalLocationFilterBackend.
        Optimized with select_related for list/retrieve actions.
        """
        queryset = super().get_queryset()
        
        # Optimization: Fetch related administrative names
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related(
                'village__grampanchayat__block__district__state'
            )
        
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        queryset = self.get_queryset()
        if hasattr(queryset, 'select_related'):
            queryset = queryset.select_related(None) 
        
        stats = queryset.aggregate(
            total_wells=Count('well_id', distinct=True),
            total_records=Count('id'),
            avg_pre_ph=Avg('pre_ph'),
            avg_post_ph=Avg('post_ph'),
            avg_pre_tds=Avg('pre_tds'),
            avg_post_tds=Avg('post_tds'),
            avg_pre_hardness=Avg('pre_hardness'),
            avg_post_hardness=Avg('post_hardness'),
            avg_pre_alkalinity=Avg('pre_alkalinity'),
            avg_post_alkalinity=Avg('post_alkalinity'),
        )
        
        well_types = queryset.values('type_of_well').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'summary': stats,
            'well_type_distribution': list(well_types),
        })
