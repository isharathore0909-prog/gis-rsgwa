from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count, Q
from django.core.cache import cache
from .models import AquiferData
from .serializers import AquiferDataSerializer, AquiferDataListSerializer, YearDataSerializer, AquiferMapSerializer
from core.filters import HierarchicalLocationFilterBackend
from core.services.cache_utils import build_cache_key
from .utils import calculate_aquifer_stats, calculate_aquifer_yearly_trends

class AquiferDataViewSet(viewsets.ModelViewSet):
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

    @action(detail=False, methods=['get'])
    def year_data(self, request):
        """
        Get data for a specific year - Optimized to avoid full object instantiation
        """
        year = request.query_params.get('year', 2024)
        try: year = int(year)
        except (ValueError, TypeError): year = 2024
        
        if not (2015 <= year <= 2024):
             return Response({'error': f'Year {year} not supported. Support range: 2015-2024'}, status=400)
        
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        
        # Build optimized queryset
        queryset = self.filter_queryset(self.get_queryset())
        
        # Use .values() for high performance
        data = queryset.values(
            'well_id', 'latitude', 'longitude', 'aquifer',
            'village__name', 
            'village__grampanchayat__block__name',
            'village__grampanchayat__block__district__name',
            'village__latitude', 'village__longitude',
            pre_field, pst_field
        )
        
        results = [
            {
                'well_id': item['well_id'],
                'village_name': item['village__name'],
                'district': item['village__grampanchayat__block__district__name'],
                'block': item['village__grampanchayat__block__name'],
                'latitude': item['latitude'] if item['latitude'] is not None else item['village__latitude'],
                'longitude': item['longitude'] if item['longitude'] is not None else item['village__longitude'],
                'year': year,
                'pre_monsoon': item.get(pre_field),
                'post_monsoon': item.get(pst_field),
                'seasonal_change': (item.get(pst_field) - item.get(pre_field)) 
                                   if item.get(pre_field) is not None and item.get(pst_field) is not None else None,
                'aquifer': item['aquifer']
            } for item in data
        ]
        
        serializer = YearDataSerializer(results, many=True)
        return Response({'year': year, 'count': len(results), 'data': serializer.data})

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Get trend analysis for all wells - Optimized with .values()
        """
        queryset = self.filter_queryset(self.get_queryset())
        years = range(2015, 2025)
        fields = ['well_id', 'village__name', 'village__grampanchayat__block__district__name']
        for year in years:
            fields.extend([f'pre_{year}', f'pst_{year}'])
            
        data = queryset.values(*fields)
        trends = []
        
        for item in data:
            pre_trend = [{'year': y, 'value': item.get(f'pre_{y}')} for y in years if item.get(f'pre_{y}') is not None]
            pst_trend = [{'year': y, 'value': item.get(f'pst_{y}')} for y in years if item.get(f'pst_{y}') is not None]
            
            trends.append({
                'well_id': item['well_id'],
                'village_name': item['village__name'],
                'district': item['village__grampanchayat__block__district__name'],
                'trend_data': {
                    'pre_monsoon_trend': pre_trend,
                    'post_monsoon_trend': pst_trend
                }
            })
        
        return Response({'count': len(trends), 'trends': trends})

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get statistical summary of groundwater levels with optimized DB access and caching.
        """
        year = request.query_params.get('year', 2024)
        try: year = int(year)
        except (ValueError, TypeError): year = 2024

        if not (2015 <= year <= 2024):
             return Response({'error': f'Year {year} not supported. Support range: 2015-2024'}, status=400)

        cache_key = build_cache_key("aquifer_stats", request, extra=str(year))
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        
        queryset = self.filter_queryset(self.get_queryset())
        final_response = calculate_aquifer_stats(year, queryset)
        
        cache.set(cache_key, final_response, 3600)
        return Response(final_response)

    @action(detail=False, methods=['get'])
    def yearly_statistics(self, request):
        """
        Get aggregated groundwater level trends (pre/pst/avg) for all years with caching.
        """
        cache_key = build_cache_key("aquifer_yearly_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
            
        queryset = self.filter_queryset(self.get_queryset())
        yearly_data = calculate_aquifer_yearly_trends(queryset)
        
        final_response = {
            'total_wells': queryset.count(),
            'yearly_trends': yearly_data
        }
        
        cache.set(cache_key, final_response, 3600)
        return Response(final_response)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """
        Get aquifer data grouped by location using optimized DB aggregation.
        """
        level = request.query_params.get('level', 'district')
        try:
            year = int(request.query_params.get('year', 2024))
        except (ValueError, TypeError):
            year = 2024
            
        if not (2015 <= year <= 2024):
             return Response({'error': f'Year {year} not supported. Support range: 2015-2024'}, status=400)
        
        if level != 'district':
             return Response({'error': 'Invalid level parameter. Use "district".'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"aquifer_loc_stats_{year}_{request.query_params.get('district_id', 'all')}"
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset())
        data = queryset.values(
            'village__grampanchayat__block__district__name'
        ).annotate(
            wells=Count('id'),
            avg_pre=Avg(f'pre_{year}'),
            avg_pst=Avg(f'pst_{year}')
        ).order_by('village__grampanchayat__block__district__name')
        
        result = [
            {
                'district': d['village__grampanchayat__block__district__name'],
                'wells': d['wells'],
                'avg_pre': round(d['avg_pre'], 2) if d['avg_pre'] is not None else None,
                'avg_pst': round(d['avg_pst'], 2) if d['avg_pst'] is not None else None,
            }
            for d in data if d['village__grampanchayat__block__district__name']
        ]
        
        final_response = {'level': 'district', 'year': year, 'data': result}
        cache.set(cache_key, final_response, 3600)
        return Response(final_response)

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        Optimized nearby search using spatial_nearby utility.
        """
        lat = request.query_params.get('latitude')
        lon = request.query_params.get('longitude')
        radius = request.query_params.get('radius_km') or request.query_params.get('radius') or 5

        if not lat or not lon:
            return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat, lon, radius_km = float(lat), float(lon), float(radius)
            from core.utils import spatial_nearby
            nearby_wells = spatial_nearby(self.queryset, lat, lon, radius_km)
            # Apply filters too
            nearby_wells = self.filter_queryset(nearby_wells)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid numeric parameters'}, status=status.HTTP_400_BAD_REQUEST)

        if not nearby_wells.exists():
            return Response({'count': 0, 'message': 'No wells found.', 'averages': None})

        # Reuse yearly trend logic
        yearly_trends = calculate_aquifer_yearly_trends(nearby_wells)
        
        # Reformat for the nearby response
        averages = { t['year']: { 'pre': t['pre_monsoon'], 'pst': t['post_monsoon'], 'avg': t['average'] } for t in yearly_trends }

        return Response({
            'latitude': lat,
            'longitude': lon,
            'count': nearby_wells.count(),
            'radius_km': radius_km,
            'averages': averages
        })
