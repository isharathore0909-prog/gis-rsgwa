"""
Water Quality API Views

This module provides ViewSets for managing and querying water quality data
with support for location-based filtering and statistical analysis.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count, Q

from .models import WaterQuality
from .serializers import WaterQualitySerializer, WaterQualityListSerializer


class WaterQualityViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for Water Quality records.
    
    This ViewSet provides comprehensive CRUD operations and custom actions
    for water quality data management and analysis.
    
    Endpoints:
        - List: GET /api/water-quality/
        - Retrieve: GET /api/water-quality/{id}/
        - Create: POST /api/water-quality/ (authenticated users only)
        - Update: PUT/PATCH /api/water-quality/{id}/ (authenticated users only)
        - Delete: DELETE /api/water-quality/{id}/ (authenticated users only)
        - Statistics: GET /api/water-quality/statistics/
        - By Location: GET /api/water-quality/by_location/?level=district
    
    Filters:
        - type_of_well: Filter by well type
        - meta_date: Filter by measurement date
        - village: Filter by village ID
        - state, district, block, grampanchayat, village_name: Location filters
        - ph_min, ph_max, tds_min, tds_max: Parameter range filters
    
    Search:
        - well_id: Search by well identifier
        - village__name: Search by village name
    
    Ordering:
        - meta_date, ph, tds, well_id
    """
    
    queryset = WaterQuality.objects.select_related(
        'village',
        'village__grampanchayat',
        'village__grampanchayat__block',
        'village__grampanchayat__block__district',
        'village__grampanchayat__block__district__state'
    ).all()
    
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_of_well', 'meta_date', 'village']
    search_fields = ['well_id', 'village__name']
    ordering_fields = ['meta_date', 'ph', 'tds', 'well_id']
    ordering = ['-meta_date']

    # =========================================================================
    # SERIALIZER METHODS
    # =========================================================================

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        
        Uses simplified serializer for list view to improve performance,
        and detailed serializer for other operations.
        """
        if self.action == 'list':
            return WaterQualityListSerializer
        return WaterQualitySerializer

    # =========================================================================
    # QUERYSET METHODS
    # =========================================================================

    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        
        Supports hierarchical location filtering and parameter range filtering.
        All filters are case-insensitive.
        
        Query Parameters:
            state (str): Filter by state name
            district (str): Filter by district name
            block (str): Filter by block name
            grampanchayat (str): Filter by grampanchayat name
            village_name (str): Filter by village name
            ph_min (float): Minimum pH value
            ph_max (float): Maximum pH value
            tds_min (float): Minimum TDS value
            tds_max (float): Maximum TDS value
        
        Returns:
            QuerySet: Filtered water quality records
        """
        queryset = super().get_queryset()
        
        # Only use select_related for details/list, not for aggregates or statistics
        if hasattr(self, 'action') and self.action in ['list', 'retrieve']:
            queryset = queryset.select_related(
                'village__grampanchayat__block__district__state'
            )
        
        # Location hierarchy filters
        location_filters = {
            'state': 'village__grampanchayat__block__district__state__name__iexact',
            'district': 'village__grampanchayat__block__district__name__iexact',
            'block': 'village__grampanchayat__block__name__iexact',
            'grampanchayat': 'village__grampanchayat__name__iexact',
            'village_name': 'village__name__iexact',
        }
        
        for param, filter_path in location_filters.items():
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{filter_path: value})
        
        # Parameter range filters
        queryset = self._apply_range_filters(queryset)
        
        return queryset

    def _apply_range_filters(self, queryset):
        """
        Apply parameter range filters to queryset.
        
        Args:
            queryset: Base queryset to filter
            
        Returns:
            QuerySet: Filtered queryset with range filters applied
        """
        # pH range filter
        ph_min = self.request.query_params.get('ph_min')
        ph_max = self.request.query_params.get('ph_max')
        if ph_min:
            queryset = queryset.filter(ph__gte=float(ph_min))
        if ph_max:
            queryset = queryset.filter(ph__lte=float(ph_max))
        
        # TDS range filter
        tds_min = self.request.query_params.get('tds_min')
        tds_max = self.request.query_params.get('tds_max')
        if tds_min:
            queryset = queryset.filter(tds__gte=float(tds_min))
        if tds_max:
            queryset = queryset.filter(tds__lte=float(tds_max))
        
        return queryset

    # =========================================================================
    # CUSTOM ACTIONS
    # =========================================================================

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get comprehensive statistical summary of water quality parameters.
        
        Endpoint: GET /api/water-quality/statistics/
        
        Returns aggregated statistics including:
        - Total number of wells and records
        - Average, min, max values for key parameters (pH, TDS, etc.)
        - Distribution of well types
        
        Respects all active filters from get_queryset().
        
        Returns:
            Response: JSON containing summary statistics and distributions
        """
        # Get basic queryset WITHOUT select_related for performance
        queryset = self.get_queryset()
        if hasattr(queryset, 'select_related'):
            queryset = queryset.select_related(None) 
        
        # Aggregate statistics
        stats = queryset.aggregate(
            total_wells=Count('well_id', distinct=True),
            total_records=Count('id'),
            avg_ph=Avg('ph'),
            min_ph=Min('ph'),
            max_ph=Max('ph'),
            avg_hardness=Avg('hardness'),
            avg_alkalinity=Avg('alkalinity'),
            avg_nitrate=Avg('nitrate'),
            avg_fluoride=Avg('fluoride'),
            avg_ec=Avg('ec'),
            avg_tds=Avg('tds'),
            max_tds=Max('tds'),
            min_tds=Min('tds'),
        )
        
        # Well type distribution
        well_types = queryset.values('type_of_well').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'summary': stats,
            'well_type_distribution': list(well_types),
        })

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """
        Get water quality data aggregated by location level.
        
        Endpoint: GET /api/water-quality/by_location/?level=district
        
        Query Parameters:
            level (str): Aggregation level - 'district' or 'block'
        
        Returns aggregated data including:
        - Record count per location
        - Average pH and TDS values
        
        Returns:
            Response: JSON containing location-aggregated data
        """
        level = request.query_params.get('level', 'district')
        queryset = self.get_queryset()
        
        if level == 'district':
            data = queryset.values(
                'village__grampanchayat__block__district__name'
            ).annotate(
                count=Count('id'),
                avg_ph=Avg('ph'),
                avg_tds=Avg('tds'),
            ).order_by('-count')
            
            return Response({
                'level': 'district',
                'data': list(data)
            })
        
        elif level == 'block':
            data = queryset.values(
                'village__grampanchayat__block__district__name',
                'village__grampanchayat__block__name'
            ).annotate(
                count=Count('id'),
                avg_ph=Avg('ph'),
                avg_tds=Avg('tds'),
            ).order_by('-count')
            
            return Response({
                'level': 'block',
                'data': list(data)
            })
        
        return Response({
            'error': 'Invalid level parameter. Use "district" or "block".'
        }, status=status.HTTP_400_BAD_REQUEST)
