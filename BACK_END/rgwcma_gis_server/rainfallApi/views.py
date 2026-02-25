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
from django.db.models import Sum, Avg, Count, Max, Min
from django.db.models.functions import TruncMonth, TruncYear
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

from core.utils import LocationFilterMixin

class RainfallViewSet(viewsets.ModelViewSet, LocationFilterMixin):
    """
    ViewSet for viewing and editing rainfall records with optimized performance.
    """
    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    
    def get_queryset(self):
        """
        Standardized filtering using LocationFilterMixin.
        """
        queryset = super().get_queryset()
        
        # Apply hierarchical location filters
        queryset = self.filter_location(queryset)
        
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
        """Aggregation for Sidebar cards."""
        queryset = self.get_queryset()
        
        # Debug logging
        total_count = queryset.count()
        non_null_count = queryset.exclude(rainfall_mm__isnull=True).count()
        non_zero_count = queryset.exclude(rainfall_mm__isnull=True).exclude(rainfall_mm=0).count()
        
        print(f"DEBUG Rainfall Stats:")
        print(f"  Total records: {total_count}")
        print(f"  Non-null rainfall_mm: {non_null_count}")
        print(f"  Non-zero rainfall_mm: {non_zero_count}")
        
        stats = queryset.aggregate(
            total=Sum('rainfall_mm'),
            avg=Avg('rainfall_mm'),
            count=Count('id'),
            max=Max('rainfall_mm')
        )
        
        print(f"  Aggregated stats: {stats}")
        
        # Find location of max rainfall
        max_val = stats.get('max')
        max_info = {}
        if max_val:
            max_record = queryset.filter(rainfall_mm=max_val).first()
            if max_record:
                max_info = {
                    'village': max_record.village.name,
                    'date': max_record.date
                }

        # Calculate Average of Station Totals (Better for Statewide view)
        # 1. Group by village, 2. Sum per village, 3. Avg of sums
        # Calculate Average of Station Totals (Better for Statewide view)
        # 1. Group by village, 2. Sum per village, 3. Avg of sums
        avg_station_total = 0
        try:
            if queryset.exists():
                # Use village_id to avoid potential joins
                station_avg = queryset.values('village_id').annotate(station_total=Sum('rainfall_mm')).aggregate(avg=Avg('station_total'))
                avg_station_total = station_avg.get('avg', 0)
        except Exception as e:
            print(f"Error calculating station average: {e}")
            # Fallback to simple average if complex aggregation fails
            avg_station_total = stats['avg']

        result = {
            'total': round(stats['total'] or 0, 2),
            'avg': round(stats['avg'] or 0, 2),
            'avg_station_total': round(avg_station_total or 0, 2),
            'count': stats['count'],
            'max': round(stats['max'] or 0, 2),
            'max_village': max_info.get('village'),
            'max_date': max_info.get('date')
        }
        
        print(f"  Returning: {result}")
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregation for Charts."""
        queryset = self.get_queryset()
        timestep = request.query_params.get('timestep', 'daily').lower()
        
        if timestep == 'monthly':
            data = queryset.annotate(month=TruncMonth('date')) \
                           .values('month') \
                           .annotate(
                               total=Sum('rainfall_mm'), 
                               village_count=Count('village_id', distinct=True)
                           ) \
                           .order_by('month')
            return Response([
                {
                    'name': d['month'].strftime('%Y-%m') if d['month'] else 'Unknown', 
                    'total': d['total'], 
                    'average': round(d['total'] / d['village_count'], 2) if d.get('village_count', 0) > 0 else 0
                } for d in data
            ])
        
        elif timestep == 'yearly':
            data = queryset.annotate(year=TruncYear('date')) \
                           .values('year') \
                           .annotate(
                               total=Sum('rainfall_mm'), 
                               village_count=Count('village_id', distinct=True)
                           ) \
                           .order_by('year')
            return Response([
                {
                    'name': d['year'].strftime('%Y') if d['year'] else 'Unknown', 
                    'total': d['total'], 
                    'average': round(d['total'] / d['village_count'], 2) if d.get('village_count', 0) > 0 else 0
                } for d in data
            ])
            
        else: # Daily
            data = queryset.values('date').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('date')
            return Response([{'name': str(d['date']), 'total': d['total'], 'average': round(d['average'] or 0, 2)} for d in data])

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        """Aggregate rainfall data by district."""
        queryset = self.get_queryset()
        
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
        queryset = Rainfall.objects.all()
        nearby_records = self.spatial_nearby(queryset, lat, lon, radius_km)
        
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

class StationRainfallViewSet(viewsets.ReadOnlyModelViewSet, LocationFilterMixin):
    """
    ViewSet for daily station rainfall data with optimized performance.
    """
    queryset = StationRainfall.objects.all()
    serializer_class = StationRainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    
    # Custom location mapping for station-based data
    location_filters = {
        'district': 'station__district__iexact',
        'station_district': 'station__district__iexact',
        'station_id': 'station_id',
        'station_name': 'station__name__iexact',
    }
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Standardized filtering (now uses the custom location_filters above)
        queryset = self.filter_location(queryset)
        
        # Apply date filters
        params = self.request.query_params
        if params.get('start_date'):
            queryset = queryset.filter(date__gte=params.get('start_date'))
        if params.get('end_date'):
            queryset = queryset.filter(date__lte=params.get('end_date'))

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
        """Optimized aggregation for Station Data."""
        queryset = self.get_queryset().exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        
        stats = queryset.aggregate(
            total=Sum('rainfall_mm'),
            avg=Avg('rainfall_mm'),
            count=Count('id'),
            max=Max('rainfall_mm')
        )
        
        max_record = None
        if stats['max'] is not None:
            max_record = queryset.filter(rainfall_mm=stats['max']).select_related('station').first()

        # Calculate Average of Station Totals
        avg_station_total = 0
        if queryset.exists():
            station_totals = queryset.values('station').annotate(total=Sum('rainfall_mm')).aggregate(avg=Avg('total'))
            avg_station_total = station_totals.get('avg', 0) or 0

        def sanitize(val):
            import math
            if val is None: return 0.0
            try:
                f = float(val)
                return 0.0 if math.isnan(f) or math.isinf(f) else f
            except: return 0.0

        return Response({
            'total': round(sanitize(stats['total']), 2),
            'avg': round(sanitize(stats['avg']), 2),
            'avg_station_total': round(sanitize(avg_station_total), 2),
            'count': stats['count'],
            'max': round(sanitize(stats['max']), 2),
            'max_village': max_record.station.name if max_record else None, 
            'max_date': max_record.date if max_record else None,
            'isStationData': True
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregation for Charts (Station Data)."""
        from django.db.models.functions import TruncMonth, TruncYear
        
        # Filter out Nulls and NaNs to prevent aggregation poisoning
        queryset = self.get_queryset().exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        timestep = request.query_params.get('timestep', 'daily').lower()
        
        # Helper to safely round
        def safe_round(val):
            if val is None: return 0.0
            import math
            try:
                f = float(val)
                if math.isnan(f) or math.isinf(f): return 0.0
                return round(f, 2)
            except: return 0.0

        if timestep == 'monthly':
            data = queryset.annotate(month=TruncMonth('date')) \
                           .values('month') \
                           .annotate(
                               total=Sum('rainfall_mm'), 
                               station_count=Count('station', distinct=True)
                           ) \
                           .order_by('month')
            
            return Response([
                {
                    'name': d['month'].strftime('%Y-%m') if d['month'] else 'Unknown', 
                    'total': safe_round(d['total']), 
                    'average': safe_round(d['total'] / d['station_count']) if d.get('station_count', 0) > 0 else 0
                } for d in data
            ])
        
        elif timestep == 'yearly':
            data = queryset.annotate(year=TruncYear('date')) \
                           .values('year') \
                           .annotate(
                               total=Sum('rainfall_mm'), 
                               station_count=Count('station', distinct=True)
                           ) \
                           .order_by('year')
                           
            return Response([
                {
                    'name': d['year'].strftime('%Y') if d['year'] else 'Unknown', 
                    'total': safe_round(d['total']), 
                    'average': safe_round(d['total'] / d['station_count']) if d.get('station_count', 0) > 0 else 0
                } for d in data
            ])
            
        else: # Daily
            data = queryset.values('date').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('date')
            return Response([{'name': str(d['date']), 'total': safe_round(d['total']), 'average': safe_round(d['average'])} for d in data])

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        """Aggregate station rainfall data by district."""
        # Filter out Nulls and NaNs
        queryset = self.get_queryset().exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        
        # Group by station's district and calculate average
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
        
        print(f"[district_wise] Returning {len(result)} districts from station data")
        for r in result[:5]:  # Log first 5 for debugging
            print(f"  {r['district']}: {r['average_rainfall']} mm (from {r['record_count']} records)")
        
        return Response(result)

