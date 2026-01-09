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
        stats = queryset.aggregate(
            total=Sum('rainfall_mm'),
            avg=Avg('rainfall_mm'),
            count=Count('id'),
            max=Max('rainfall_mm')
        )
        
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

        return Response({
            'total': round(stats['total'] or 0, 2),
            'avg': round(stats['avg'] or 0, 2),
            'count': stats['count'],
            'max': stats['max'] or 0,
            'max_village': max_info.get('village'),
            'max_date': max_info.get('date')
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregation for Charts."""
        queryset = self.get_queryset()
        timestep = request.query_params.get('timestep', 'daily').lower()
        
        if timestep == 'monthly':
            # SQLite specific date formatting - Escaped % as %% for Django .extra()
            data = queryset.extra(select={'month': "strftime('%%Y-%%m', date)"}) \
                           .values('month') \
                           .annotate(total=Sum('rainfall_mm')) \
                           .order_by('month')
            return Response([{'name': d['month'], 'total': d['total']} for d in data])
        
        elif timestep == 'yearly':
            data = queryset.extra(select={'year': "strftime('%%Y', date)"}) \
                           .values('year') \
                           .annotate(total=Sum('rainfall_mm')) \
                           .order_by('year')
            return Response([{'name': d['year'], 'total': d['total']} for d in data])
            
        else: # Daily
            data = queryset.values('date').annotate(total=Sum('rainfall_mm')).order_by('date')
            return Response([{'name': d['date'], 'total': d['total']} for d in data])
