from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count, Q
from .models import AquiferData
from .serializers import AquiferDataSerializer, AquiferDataListSerializer, YearDataSerializer

from core.utils import LocationFilterMixin

class AquiferDataViewSet(viewsets.ModelViewSet, LocationFilterMixin):
    """
    ViewSet for Aquifer groundwater level data with optimized performance.
    """
    queryset = AquiferData.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['aquifer', 'village']
    search_fields = ['well_id', 'village__name', 'aquifer']
    ordering_fields = ['well_id', 'well_depth']
    ordering = ['well_id']

    def get_serializer_class(self):
        """Use simplified serializer for list view unless detailed=true"""
        if self.action == 'list':
            if self.request.query_params.get('detailed') == 'true':
                return AquiferDataSerializer
            return AquiferDataListSerializer
        return AquiferDataSerializer

    def get_queryset(self):
        """Standardized location filtering using LocationFilterMixin."""
        queryset = super().get_queryset()
        
        # Apply hierarchical location filters
        queryset = self.filter_location(queryset)
        
        # Optimization: Fetch related administrative names ONLY when needed
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related(
                'village__grampanchayat__block__district__state'
            )
            
        return queryset

    @action(detail=False, methods=['get'])
    def year_data(self, request):
        """
        Get data for a specific year - Optimized to avoid full object instantiation
        """
        year = request.query_params.get('year', 2024)
        try:
            year = int(year)
        except ValueError:
            year = 2024
        
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        
        queryset = self.get_queryset()
        
        # Use .values() for high performance
        data = queryset.values(
            'well_id', 'latitude', 'longitude', 'aquifer',
            'village__name', 
            'village__grampanchayat__block__name',
            'village__grampanchayat__block__district__name',
            pre_field, pst_field
        )
        
        # Format results in a single pass
        results = []
        for item in data:
            pre_val = item.get(pre_field)
            pst_val = item.get(pst_field)
            results.append({
                'well_id': item['well_id'],
                'village_name': item['village__name'],
                'district': item['village__grampanchayat__block__district__name'],
                'block': item['village__grampanchayat__block__name'],
                'latitude': item['latitude'],
                'longitude': item['longitude'],
                'year': year,
                'pre_monsoon': pre_val,
                'post_monsoon': pst_val,
                'seasonal_change': (pst_val - pre_val) if pre_val is not None and pst_val is not None else None
            })
        
        return Response({
            'year': year,
            'count': len(results),
            'data': results
        })

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Get trend analysis for all wells - Optimized with .values()
        """
        queryset = self.get_queryset()
        
        # Define all the fields we need for trends
        years = range(2015, 2025)
        fields = ['well_id', 'village__name', 'village__grampanchayat__block__district__name']
        for year in years:
            fields.extend([f'pre_{year}', f'pst_{year}'])
            
        data = queryset.values(*fields)
        trends = []
        
        for item in data:
            pre_trend = []
            pst_trend = []
            for year in years:
                pre_val = item.get(f'pre_{year}')
                pst_val = item.get(f'pst_{year}')
                if pre_val is not None: pre_trend.append({'year': year, 'value': pre_val})
                if pst_val is not None: pst_trend.append({'year': year, 'value': pst_val})
            
            trends.append({
                'well_id': item['well_id'],
                'village_name': item['village__name'],
                'district': item['village__grampanchayat__block__district__name'],
                'trend_data': {
                    'pre_monsoon_trend': pre_trend,
                    'post_monsoon_trend': pst_trend
                }
            })
        
        return Response({
            'count': len(trends),
            'trends': trends
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get statistical summary of groundwater levels
        GET /api/aquifer/statistics/?year=2024
        """
        year = request.query_params.get('year', 2024)
        try:
            year = int(year)
        except ValueError:
            year = 2024
        
        queryset = self.get_queryset()
        
        # Calculate statistics for the specified year using DB aggregation
        # This is much faster and avoids loading geometry fields that might be corrupted
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        
        # Perform aggregation in one query
        agg_stats = queryset.aggregate(
            total_wells=Count('id'),
            wells_with_pre_data=Count(pre_field),
            wells_with_pst_data=Count(pst_field),
            avg_pre=Avg(pre_field),
            min_pre=Min(pre_field),
            max_pre=Max(pre_field),
            avg_pst=Avg(pst_field),
            min_pst=Min(pst_field),
            max_pst=Max(pst_field)
        )
        
        # Calculate long-term average across all years for which data exists
        years = range(2015, 2025)
        longterm_agg = {}
        for y in years:
            longterm_agg[f'pre_{y}'] = Avg(f'pre_{y}')
            longterm_agg[f'pst_{y}'] = Avg(f'pst_{y}')
        
        longterm_results = queryset.aggregate(**longterm_agg)
        valid_vals = [v for v in longterm_results.values() if v is not None]
        avg_longterm = sum(valid_vals) / len(valid_vals) if valid_vals else None
        
        stats = {
            'year': year,
            'total_wells': agg_stats['total_wells'],
            'wells_with_pre_data': agg_stats['wells_with_pre_data'],
            'wells_with_pst_data': agg_stats['wells_with_pst_data'],
            'avg_pre_monsoon': agg_stats['avg_pre'],
            'avg_pst_monsoon': agg_stats['avg_pst'],
            'avg_longterm': round(avg_longterm, 2) if avg_longterm is not None else None,
            'min_pre_monsoon': agg_stats['min_pre'],
            'max_pre_monsoon': agg_stats['max_pre'],
            'min_pst_monsoon': agg_stats['min_pst'],
            'max_pst_monsoon': agg_stats['max_pst']
        }
        
        # Aquifer type distribution (already uses .values() which is safe)
        aquifer_dist = queryset.values('aquifer').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'summary': stats,
            'aquifer_distribution': list(aquifer_dist),
        })

    @action(detail=False, methods=['get'])
    def yearly_statistics(self, request):
        """
        Get aggregated groundwater level trends (pre/pst/avg) for all years.
        Aggregates across all wells in the filtered queryset.
        """
        queryset = self.get_queryset()
        years = range(2015, 2025)
        
        # Build aggregation map for all years
        agg_map = {}
        for year in years:
            agg_map[f'pre_{year}'] = Avg(f'pre_{year}')
            agg_map[f'pst_{year}'] = Avg(f'pst_{year}')
            
        results = queryset.aggregate(**agg_map)
        
        # Format the yearly data
        yearly_data = []
        for year in years:
            pre_val = results[f'pre_{year}']
            pst_val = results[f'pst_{year}']
            
            avg_val = None
            if pre_val is not None and pst_val is not None:
                avg_val = round((pre_val + pst_val) / 2, 2)
            elif pre_val is not None:
                avg_val = round(pre_val, 2)
            elif pst_val is not None:
                avg_val = round(pst_val, 2)
                
            yearly_data.append({
                'year': str(year),
                'pre_monsoon': round(pre_val, 2) if pre_val is not None else None,
                'post_monsoon': round(pst_val, 2) if pst_val is not None else None,
                'average': avg_val
            })
            
        return Response({
            'total_wells': queryset.count(),
            'yearly_trends': yearly_data
        })

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """
        Get aquifer data grouped by location using optimized DB aggregation.
        GET /api/aquifer/by_location/?level=district&year=2024
        """
        level = request.query_params.get('level', 'district')
        year = int(request.query_params.get('year', 2024))
        queryset = self.get_queryset()
        
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        
        if level == 'district':
            # Perform grouping and averaging in the database
            data = queryset.values(
                'village__grampanchayat__block__district__name'
            ).annotate(
                wells=Count('id'),
                avg_pre=Avg(pre_field),
                avg_pst=Avg(pst_field)
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
            
            return Response({
                'level': 'district',
                'year': year,
                'data': result
            })
        
        return Response({
            'error': 'Invalid level parameter. Use "district".'
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        Optimized nearby search using spatial_nearby utility.
        Supports both 'radius_km' and 'radius' parameters.
        """
        lat = request.query_params.get('latitude')
        lon = request.query_params.get('longitude')
        radius = request.query_params.get('radius_km') or request.query_params.get('radius') or 5

        if not lat or not lon:
            return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = float(lat)
            lon = float(lon)
            radius_km = float(radius)
            
            queryset = AquiferData.objects.all()
            nearby_wells = self.spatial_nearby(queryset, lat, lon, radius_km)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid numeric parameters'}, status=status.HTTP_400_BAD_REQUEST)

        if not nearby_wells.exists():
            return Response({
                'count': 0,
                'message': 'No wells found within the specified radius.',
                'averages': None
            })

        # Calculate averages for all years in a single optimized DB query
        years = range(2015, 2025)
        agg_map = {}
        for year in years:
            agg_map[f'pre_{year}'] = Avg(f'pre_{year}')
            agg_map[f'pst_{year}'] = Avg(f'pst_{year}')
        
        results = nearby_wells.aggregate(**agg_map)
        
        # Format the output efficiently
        averages = {}
        for year in years:
            pre_val = results[f'pre_{year}']
            pst_val = results[f'pst_{year}']
            
            avg_val = None
            if pre_val is not None and pst_val is not None:
                avg_val = round((pre_val + pst_val) / 2, 2)
            elif pre_val is not None:
                avg_val = round(pre_val, 2)
            elif pst_val is not None:
                avg_val = round(pst_val, 2)
                
            averages[str(year)] = {
                'pre': round(pre_val, 2) if pre_val is not None else None,
                'pst': round(pst_val, 2) if pst_val is not None else None,
                'avg': avg_val
            }

        return Response({
            'latitude': lat,
            'longitude': lon,
            'count': nearby_wells.count(),
            'radius_km': radius_km,
            'averages': averages
        })
