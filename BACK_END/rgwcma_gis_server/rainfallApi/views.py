"""
Rainfall API Views
Aggregates and serves historical rainfall data with optimized location hierarchy.
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Sum, Avg, Count, Max, Min, Q
from django.db.models.functions import TruncMonth, TruncYear
from django.core.cache import cache
from .models import Rainfall
from .serializers import RainfallSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow public read access and admin-only write access.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

from core.filters import HierarchicalLocationFilterBackend

from .utils import calculate_rainfall_stats, calculate_rainfall_summary, safe_round

class RainfallViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing rainfall records with optimized performance.
    """
    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    filter_backends = [HierarchicalLocationFilterBackend]

    def get_queryset(self):
        """
        Standardized filtering now handled by HierarchicalLocationFilterBackend.
        """
        queryset = super().get_queryset()
        
        # Apply date filters
        params = self.request.query_params
        if params.get('start_date'):
            queryset = queryset.filter(date__gte=params.get('start_date'))
        if params.get('end_date'):
            queryset = queryset.filter(date__lte=params.get('end_date'))

        # Optimization: Fetch related administrative names in a single query
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')

        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Aggregation for Sidebar cards with caching."""
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"rainfall_stats_{'_'.join(loc_params) if loc_params else 'all'}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
            
        queryset = self.filter_queryset(self.get_queryset())
        result = calculate_rainfall_stats(queryset, is_station_data=False)
        
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregation for Charts with caching."""
        timestep = request.query_params.get('timestep', 'daily').lower()
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"rainfall_summary_{timestep}_{'_'.join(loc_params) if loc_params else 'all'}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset())
        result = calculate_rainfall_summary(queryset, timestep=timestep, is_station_data=False)

        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        """Aggregate rainfall data by district."""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Group by district and calculate the average
        # village -> grampanchayat -> block -> district
        data = queryset.values('village__grampanchayat__block__district__name') \
                       .annotate(average_rainfall=Avg('rainfall_mm')) \
                       .order_by('village__grampanchayat__block__district__name')
        
        result = [
            {
                'district': d['village__grampanchayat__block__district__name'],
                'average_rainfall': round(d['average_rainfall'] or 0, 2)
            }
            for d in data if d['village__grampanchayat__block__district__name']
        ]
        
        return Response(result)


    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        Get rainfall data for a specific lat/lon by averaging nearby stations.
        Supports both 'lat/lon' and 'latitude/longitude' parameters.
        """
        params = request.query_params
        lat_val = params.get('lat') or params.get('latitude')
        lon_val = params.get('lon') or params.get('longitude')
        radius_val = params.get('radius_km') or params.get('radius') or 10
        gram_panchayat = params.get('gram_panchayat')

        try:
            lat = float(lat_val)
            lon = float(lon_val)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Valid lat and lon parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            radius_km = float(radius_val)
        except (TypeError, ValueError):
            radius_km = 10
        
        # Use centralized spatial/approximate nearby filter
        from core.utils import spatial_nearby
        nearby_records = spatial_nearby(queryset, lat, lon, radius_km)
        
        # Filter by gram panchayat if provided
        if gram_panchayat:
            nearby_records = nearby_records.filter(village__grampanchayat__name__iexact=gram_panchayat)
        
        # Optimization: select related only if we need village names later
        nearby_records = nearby_records.select_related('village')
        
        if not nearby_records.exists():
            return Response({
                'message': 'No rainfall data found nearby',
                'count': 0,
                'stats': None,
                'summary': []
            })
        
        # Get statistics
        stats = nearby_records.aggregate(
            total=Sum('rainfall_mm'),
            avg=Avg('rainfall_mm'),
            count=Count('id'),
            max=Max('rainfall_mm'),
            min=Min('rainfall_mm')
        )
        
        # Get max record details
        max_val = stats.get('max')
        max_info = {}
        if max_val:
            max_record = nearby_records.filter(rainfall_mm=max_val).first()
            if max_record:
                max_info = {
                    'village': max_record.village.name,
                    'date': max_record.date
                }
        
        # Get timestep for aggregation
        timestep = request.query_params.get('timestep', 'monthly').lower()
        
        # Aggregate by timestep
        if timestep == 'monthly':
            summary_data = nearby_records.annotate(month=TruncMonth('date')) \
                                        .values('month') \
                                        .annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')) \
                                        .order_by('month')
            summary = [
                {
                    'name': d['month'].strftime('%Y-%m') if d['month'] else 'Unknown', 
                    'total': round(d['total'] or 0, 2), 
                    'average': round(d['average'] or 0, 2)
                } for d in summary_data
            ]
        elif timestep == 'yearly':
            summary_data = nearby_records.annotate(year=TruncYear('date')) \
                                        .values('year') \
                                        .annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')) \
                                        .order_by('year')
            summary = [
                {
                    'name': d['year'].strftime('%Y') if d['year'] else 'Unknown', 
                    'total': round(d['total'] or 0, 2), 
                    'average': round(d['average'] or 0, 2)
                } for d in summary_data
            ]
        else:  # daily
            summary_data = nearby_records.values('date').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('date')
            summary = [{'name': str(d['date']), 'total': round(d['total'] or 0, 2), 'average': round(d['average'] or 0, 2)} for d in summary_data]
        
        return Response({
            'location': {'lat': lat, 'lon': lon},
            'radius_km': radius_km,
            'gram_panchayat': gram_panchayat,
            'count': stats['count'],
            'stats': {
                'total': round(stats['total'] or 0, 2),
                'avg': round(stats['avg'] or 0, 2),
                'max': round(stats['max'] or 0, 2),
                'min': round(stats['min'] or 0, 2),
                'max_village': max_info.get('village'),
                'max_date': max_info.get('date')
            },
            'summary': summary
        })

from .models import RainfallStation, StationRainfall
from .serializers import RainfallStationSerializer, StationRainfallSerializer

from rest_framework.pagination import LimitOffsetPagination

class StationRainfallViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for daily station rainfall data with optimized performance.
    """
    queryset = StationRainfall.objects.all()
    serializer_class = StationRainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    filter_backends = [HierarchicalLocationFilterBackend]
    
    # Custom location mapping for station-based data
    location_filters = {
        'district': 'station__district__iexact',
        'station_district': 'station__district__iexact',
        'station_id': 'station_id',
        'station_name': 'station__name__iexact',
        'station_ids': 'station_id__in',
    }
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Apply date filters
        params = self.request.query_params
        if params.get('start_date'):
            queryset = queryset.filter(date__gte=params.get('start_date'))
        if params.get('end_date'):
            queryset = queryset.filter(date__lte=params.get('end_date'))

        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('station')

        return queryset

    @action(detail=False, methods=['get'])
    def stations(self, request):
        """List all stations, optionally filtered by district."""
        stations = RainfallStation.objects.all()
        district = request.query_params.get('district')
        if district:
            stations = stations.filter(district__iexact=district)
            
        serializer = RainfallStationSerializer(stations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Optimized aggregation for Station Data with caching."""
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"station_rainfall_stats_{'_'.join(loc_params) if loc_params else 'all'}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        result = calculate_rainfall_stats(queryset, is_station_data=True)
        
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregation for Charts (Station Data) with caching."""
        timestep = request.query_params.get('timestep', 'daily').lower()
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"station_rainfall_summary_{timestep}_{'_'.join(loc_params) if loc_params else 'all'}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        result = calculate_rainfall_summary(queryset, timestep=timestep, is_station_data=True)

        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        """Aggregate station rainfall data by district."""
        cache_key = f"station_rainfall_district_wise"
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        
        data = queryset.values('station__district') \
                       .annotate(average_rainfall=Avg('rainfall_mm'), 
                                total_rainfall=Sum('rainfall_mm'),
                                record_count=Count('id')) \
                       .order_by('station__district')
        
        result = [
            {
                'district': d['station__district'],
                'average_rainfall': round(d['average_rainfall'] or 0, 2),
                'total_rainfall': round(d['total_rainfall'] or 0, 2),
                'record_count': d['record_count']
            }
            for d in data if d['station__district']
        ]
        
        cache.set(cache_key, result, 3600)
        return Response(result)

