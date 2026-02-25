"""
Water Quality API Views

This module provides ViewSets for managing and querying water quality data
with support for location-based filtering and statistical analysis.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count, Q

from .models import WaterQuality
from .serializers import WaterQualitySerializer, WaterQualityListSerializer
from .utils import calculate_wqi, check_quality_status


from core.utils import LocationFilterMixin

class WaterQualityViewSet(viewsets.ModelViewSet, LocationFilterMixin):
    """
    API ViewSet for Water Quality records with optimized filtering and performance.
    """
    queryset = WaterQuality.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_of_well', 'meta_date', 'village']
    search_fields = ['well_id', 'village__name']
    ordering_fields = ['meta_date', 'ph', 'tds', 'well_id']
    ordering = ['-meta_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return WaterQualityListSerializer
        return WaterQualitySerializer

    def get_queryset(self):
        """
        Standardized location filtering using LocationFilterMixin.
        Optimized with select_related ONLY for list/retrieve actions.
        """
        queryset = super().get_queryset()
        
        # Apply hierarchical location filters
        queryset = self.filter_location(queryset)
        
        # Apply parameter range filters
        queryset = self._apply_range_filters(queryset)
        
        # Optimization: Fetch related administrative names in a single query
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related(
                'village__grampanchayat__block__district__state'
            )
        
        return queryset

    def _apply_range_filters(self, queryset):
        params = self.request.query_params
        range_mapping = {
            'ph_min': 'ph__gte',
            'ph_max': 'ph__lte',
            'tds_min': 'tds__gte',
            'tds_max': 'tds__lte',
        }
        for param, filter_key in range_mapping.items():
            value = params.get(param)
            if value:
                queryset = queryset.filter(**{filter_key: float(value)})
        return queryset

    # =========================================================================
    # CUSTOM ACTIONS
    # =========================================================================

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get comprehensive statistical summary of water quality parameters.
        Includes calculated WQI and overall status based on filtered data.
        """
        queryset = self.get_queryset()
        if hasattr(queryset, 'select_related'):
            queryset = queryset.select_related(None) 
        
        # Aggregate statistics
        aggregation_params = {
            'total_wells': Count('well_id', distinct=True),
            'total_records': Count('id'),
            'avg_ph': Avg('ph'),
            'avg_hardness': Avg('hardness'),
            'avg_alkalinity': Avg('alkalinity'),
            'avg_nitrate': Avg('nitrate'),
            'avg_fluoride': Avg('fluoride'),
            'avg_ec': Avg('ec'),
            'avg_tds': Avg('tds'),
            # Exceedance counts
            'ec_exceedance': Count('id', filter=Q(ec__gt=3000)),
            'fluoride_exceedance': Count('id', filter=Q(fluoride__gt=1.5)),
            'nitrate_exceedance': Count('id', filter=Q(nitrate__gt=45)),
            'hardness_exceedance': Count('id', filter=Q(hardness__gt=600)),
            'tds_exceedance': Count('id', filter=Q(tds__gt=2000)),
        }

        # Helper to check if field exists in model
        def field_exists(model, field_name):
            try:
                model._meta.get_field(field_name)
                return True
            except Exception:
                return False

        # Optional fields based on model presence
        if field_exists(WaterQuality, 'iron'):
            aggregation_params['avg_iron'] = Avg('iron')
            aggregation_params['iron_exceedance'] = Count('id', filter=Q(iron__gt=1.0))
        
        if field_exists(WaterQuality, 'arsenic'):
            aggregation_params['avg_arsenic'] = Avg('arsenic')
            aggregation_params['arsenic_exceedance'] = Count('id', filter=Q(arsenic__gt=10))
            
        if field_exists(WaterQuality, 'uranium'):
            aggregation_params['avg_uranium'] = Avg('uranium')
            aggregation_params['uranium_exceedance'] = Count('id', filter=Q(uranium__gt=30))
            
        if field_exists(WaterQuality, 'chloride'):
            aggregation_params['avg_chloride'] = Avg('chloride')
            aggregation_params['chloride_exceedance'] = Count('id', filter=Q(chloride__gt=1000))

        stats = queryset.aggregate(**aggregation_params)
        
        # Round averages and prep summary
        summary = {}
        for k, v in stats.items():
            if k.startswith('avg_'):
                summary[k] = round(v, 2) if v is not None else 0
            else:
                summary[k] = v or 0
        
        # Calculate WQI and Status based on aggregated averages
        wqi_data = calculate_wqi(summary)
        quality_status = check_quality_status(summary)
        
        # Well type distribution
        well_types = queryset.values('type_of_well').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'summary': summary,
            'wqi': wqi_data,
            'status': quality_status,
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
