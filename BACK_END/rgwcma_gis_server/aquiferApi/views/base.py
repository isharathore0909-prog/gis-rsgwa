from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .mixins import AquiferStatsMixin, AquiferAnalysisMixin, AquiferSpatialMixin
from ..models import AquiferData
from ..serializers import (
    AquiferDataSerializer, AquiferDataListSerializer, 
    AquiferMapSerializer
)
from core.filters import HierarchicalLocationFilterBackend

class AquiferDataViewSet(viewsets.ModelViewSet, AquiferStatsMixin, AquiferAnalysisMixin, AquiferSpatialMixin):
    """
    ViewSet for Aquifer groundwater level data with optimized performance.
    """
    queryset = AquiferData.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = ['aquifer']
    search_fields = ['well_id', 'village__name', 'aquifer']
    ordering_fields = ['well_id', 'well_depth']
    ordering = ['well_id']

    def get_serializer_class(self):
        """Use ultra-slim serializer for map markers, full detailed for sidebar"""
        if self.action == 'list':
            if self.request.query_params.get('map_markers') == 'true':
                return AquiferMapSerializer
            if self.request.query_params.get('detailed') == 'true':
                return AquiferDataSerializer
            return AquiferDataListSerializer
        return AquiferDataSerializer

    def list(self, request, *args, **kwargs):
        """
        Custom list implementation to support high-performance map marker delivery.
        """
        is_map_request = request.query_params.get('map_markers') == 'true'
        
        if is_map_request:
            # Bypass DRF serialization for map markers to achieve maximum speed
            # Filter and optimize the queryset
            queryset = self.filter_queryset(self.get_queryset())
            
            # Use values() to avoid object instantiation overhead
            data = queryset.values(
                'id', 
                'well_id', 
                'latitude', 
                'longitude', 
                'aquifer',
                'village__name',
                'village__grampanchayat__block__district__name',
                'pre_2024',
                'pst_2024'
            )
            
            # Construct the response list manually
            results = [
                {
                    'id': item['id'],
                    'well_id': item['well_id'],
                    'latitude': item['latitude'],
                    'longitude': item['longitude'],
                    'aquifer': item['aquifer'],
                    'village_name': item['village__name'],
                    'district': item['village__grampanchayat__block__district__name'],
                    'pre_2024': item['pre_2024'],
                    'pst_2024': item['pst_2024']
                } for item in data
            ]
            
            return Response(results)
            
        return super().list(request, *args, **kwargs)

    def paginate_queryset(self, queryset):
        """Disable pagination for map-ready requests (all markers in a district)"""
        if self.request.query_params.get('map_markers') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        """
        Optimized query based on action and parameters using annotations 
        to avoid deep relationship traversals in serializers.
        """
        from django.db.models import F
        queryset = super().get_queryset()
        
        # Determine if we need location annotations 
        # (NOT needed for map markers, statistics, or yearly_statistics)
        is_map_request = self.request.query_params.get('map_markers') == 'true'
        is_stats_request = self.action in ['statistics', 'yearly_statistics']
        
        # Only add heavy annotations if we are likely to serialize individual records
        # Note: Added is_map_request to support District aggregation even on slim responses
        if not is_stats_request and self.action in ['list', 'retrieve', 'year_data']:
            queryset = queryset.annotate(
                ann_village_name=F('village__name'),
                ann_gp_name=F('village__grampanchayat__name'),
                ann_block_name=F('village__grampanchayat__block__name'),
                ann_district_name=F('village__grampanchayat__block__district__name'),
                ann_state_name=F('village__grampanchayat__block__district__state__name'),
            )

        if self.action == 'list':
            if is_map_request:
                # Map Marker Optimization: Only fetch essential fields
                return queryset.select_related('village', 'village__grampanchayat__block__district').only(
                    'id', 'well_id', 'latitude', 'longitude', 'aquifer',
                    'village__name', 'village__latitude', 'village__longitude',
                    'village__grampanchayat__block__district__name'
                )
            
            # Standard list view optimization - select_related is still good but 
            # our annotations will handle most display fields
            return queryset.select_related('village')
            
        return queryset
