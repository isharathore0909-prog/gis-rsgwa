"""
Rainfall API Views
Aggregates and serves historical rainfall data with optimized location hierarchy.
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count, Max, Min
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

class RainfallViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing rainfall records.
    Supports filtering by location (village, GP, block, district) and date range.
    """
    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        queryset = Rainfall.objects.all()
        
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')

        params = self.request.query_params
        
        # Exact matching for better performance on indices
        filters = {
            'village_id': 'village_id',
            'village': 'village__name__iexact',
            'gram_panchayat': 'village__grampanchayat__name__iexact',
            'district': 'village__grampanchayat__block__district__name__iexact',
            'block': 'village__grampanchayat__block__name__iexact',
            'start_date': 'date__gte',
            'end_date': 'date__lte',
        }

        for param, filter_key in filters.items():
            value = params.get(param)
            if value:
                queryset = queryset.filter(**{filter_key: value})

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
            # SQLite specific date formatting - Escaped % as %% for Django .extra()
            data = queryset.extra(select={'month': "strftime('%%Y-%%m', date)"}) \
                           .values('month') \
                           .annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')) \
                           .order_by('month')
            return Response([{'name': d['month'], 'total': d['total'], 'average': round(d['average'], 2)} for d in data])
        
        elif timestep == 'yearly':
            data = queryset.extra(select={'year': "strftime('%%Y', date)"}) \
                           .values('year') \
                           .annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')) \
                           .order_by('year')
            return Response([{'name': d['year'], 'total': d['total'], 'average': round(d['average'], 2)} for d in data])
            
        else: # Daily
            data = queryset.values('date').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('date')
            return Response([{'name': d['date'], 'total': d['total'], 'average': round(d['average'], 2)} for d in data])

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
        Query params:
        - lat: Latitude
        - lon: Longitude
        - radius_km: Search radius in kilometers (default: 10)
        - gram_panchayat: Optional filter for specific gram panchayat
        """
        try:
            lat = float(request.query_params.get('lat'))
            lon = float(request.query_params.get('lon'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'Valid lat and lon parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        radius_km = float(request.query_params.get('radius_km', 10))
        gram_panchayat = request.query_params.get('gram_panchayat')
        
        # Simple distance calculation using Haversine formula approximation
        # For more accurate results, consider using GeoDjango
        # Approximate degrees per km at this latitude
        lat_degree_km = 111.0
        
        # 1 degree lon depends on latitude: 111 * cos(lat)
        # Avoid division by zero if lat is 90
        import math
        lat_rad = math.radians(abs(float(lat)))
        cos_lat = math.cos(lat_rad)
        
        if cos_lat < 0.0001:
            lon_degree_km = 1.0 # arbitrary small number near pole
        else:
            lon_degree_km = 111.0 * cos_lat
        
        lat_delta = radius_km / lat_degree_km
        lon_delta = radius_km / lon_degree_km
        
        # Get base queryset with location filters
        queryset = Rainfall.objects.select_related('village__grampanchayat__block__district')
        
        # Filter by gram panchayat if provided
        if gram_panchayat:
            queryset = queryset.filter(village__grampanchayat__name__iexact=gram_panchayat)
        
        # Find nearby rainfall records
        # Note: This is a simple bounding box filter. For production, use proper geospatial queries
        nearby_records = queryset.filter(
            latitude__gte=lat - lat_delta,
            latitude__lte=lat + lat_delta,
            longitude__gte=lon - lon_delta,
            longitude__lte=lon + lon_delta
        )
        
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
            summary_data = nearby_records.extra(select={'month': "strftime('%%Y-%%m', date)"}) \
                                        .values('month') \
                                        .annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')) \
                                        .order_by('month')
            summary = [{'name': d['month'], 'total': round(d['total'] or 0, 2), 'average': round(d['average'] or 0, 2)} for d in summary_data]
        elif timestep == 'yearly':
            summary_data = nearby_records.extra(select={'year': "strftime('%%Y', date)"}) \
                                        .values('year') \
                                        .annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')) \
                                        .order_by('year')
            summary = [{'name': d['year'], 'total': round(d['total'] or 0, 2), 'average': round(d['average'] or 0, 2)} for d in summary_data]
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
