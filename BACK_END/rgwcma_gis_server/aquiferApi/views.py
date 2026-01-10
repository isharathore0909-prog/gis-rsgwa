from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count, Q
from .models import AquiferData
from .serializers import AquiferDataSerializer, AquiferDataListSerializer, YearDataSerializer

class AquiferDataViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Aquifer groundwater level data.
    
    Provides:
    - List: GET /api/aquifer/
    - Retrieve: GET /api/aquifer/{id}/
    - Create: POST /api/aquifer/ (authenticated users only)
    - Update: PUT/PATCH /api/aquifer/{id}/ (authenticated users only)
    - Delete: DELETE /api/aquifer/{id}/ (authenticated users only)
    - Year Data: GET /api/aquifer/year_data/?year=2024
    - Trends: GET /api/aquifer/trends/
    - Statistics: GET /api/aquifer/statistics/
    """
    queryset = AquiferData.objects.select_related(
        'village',
        'village__grampanchayat',
        'village__grampanchayat__block',
        'village__grampanchayat__block__district',
        'village__grampanchayat__block__district__state'
    ).all()
    permission_classes = [IsAuthenticatedOrReadOnly]
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
        """Filter queryset based on query parameters for location hierarchy"""
        queryset = super().get_queryset()
        
        # Filter by state
        state = self.request.query_params.get('state', None)
        if state:
            queryset = queryset.filter(
                village__grampanchayat__block__district__state__name__iexact=state
            )
        
        # Filter by district
        district = self.request.query_params.get('district', None)
        if district:
            queryset = queryset.filter(
                village__grampanchayat__block__district__name__iexact=district
            )
        
        # Filter by block
        block = self.request.query_params.get('block', None)
        if block:
            queryset = queryset.filter(
                village__grampanchayat__block__name__iexact=block
            )
        
        # Filter by grampanchayat
        grampanchayat = self.request.query_params.get('grampanchayat', None)
        if grampanchayat:
            queryset = queryset.filter(
                village__grampanchayat__name__iexact=grampanchayat
            )
        
        # Filter by village name
        village_name = self.request.query_params.get('village_name', None)
        if village_name:
            queryset = queryset.filter(village__name__iexact=village_name)
        
        return queryset

    @action(detail=False, methods=['get'])
    def year_data(self, request):
        """
        Get data for a specific year
        GET /api/aquifer/year_data/?year=2024
        """
        year = request.query_params.get('year', 2024)
        try:
            year = int(year)
            if year < 2015 or year > 2024:
                return Response({
                    'error': 'Year must be between 2015 and 2024'
                }, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({
                'error': 'Invalid year parameter'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset()
        data = []
        
        for record in queryset:
            year_data = record.get_year_data(year)
            data.append({
                'well_id': record.well_id,
                'village_name': record.village_name,
                'district': record.district,
                'block': record.block,
                'latitude': record.latitude,
                'longitude': record.longitude,
                **year_data
            })
        
        return Response({
            'year': year,
            'count': len(data),
            'data': data
        })

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Get trend analysis for all wells
        GET /api/aquifer/trends/
        """
        queryset = self.get_queryset()
        trends = []
        
        for record in queryset:
            trends.append({
                'well_id': record.well_id,
                'village_name': record.village_name,
                'district': record.district,
                'trend_data': record.get_trend_data()
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
        
        # Calculate statistics for the specified year
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        
        # Filter records that have data for this year
        records_with_pre = queryset.exclude(**{f'{pre_field}__isnull': True})
        records_with_pst = queryset.exclude(**{f'{pst_field}__isnull': True})
        
        stats = {
            'year': year,
            'total_wells': queryset.count(),
            'wells_with_pre_data': records_with_pre.count(),
            'wells_with_pst_data': records_with_pst.count(),
        }
        
        # Calculate averages if data exists
        if records_with_pre.exists():
            pre_values = [getattr(r, pre_field) for r in records_with_pre if getattr(r, pre_field) is not None]
            if pre_values:
                stats['avg_pre_monsoon'] = sum(pre_values) / len(pre_values)
                stats['min_pre_monsoon'] = min(pre_values)
                stats['max_pre_monsoon'] = max(pre_values)
        
        if records_with_pst.exists():
            pst_values = [getattr(r, pst_field) for r in records_with_pst if getattr(r, pst_field) is not None]
            if pst_values:
                stats['avg_pst_monsoon'] = sum(pst_values) / len(pst_values)
                stats['min_pst_monsoon'] = min(pst_values)
                stats['max_pst_monsoon'] = max(pst_values)
        
        # Aquifer type distribution
        aquifer_dist = queryset.values('aquifer').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'summary': stats,
            'aquifer_distribution': list(aquifer_dist),
        })

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """
        Get aquifer data grouped by location
        GET /api/aquifer/by_location/?level=district&year=2024
        """
        level = request.query_params.get('level', 'district')
        year = int(request.query_params.get('year', 2024))
        queryset = self.get_queryset()
        
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        
        if level == 'district':
            # Group by district
            districts = {}
            for record in queryset:
                dist_name = record.district
                if dist_name not in districts:
                    districts[dist_name] = {
                        'district': dist_name,
                        'wells': 0,
                        'pre_values': [],
                        'pst_values': []
                    }
                
                districts[dist_name]['wells'] += 1
                pre_val = getattr(record, pre_field, None)
                pst_val = getattr(record, pst_field, None)
                
                if pre_val is not None:
                    districts[dist_name]['pre_values'].append(pre_val)
                if pst_val is not None:
                    districts[dist_name]['pst_values'].append(pst_val)
            
            # Calculate averages
            result = []
            for dist_name, data in districts.items():
                result.append({
                    'district': dist_name,
                    'wells': data['wells'],
                    'avg_pre': sum(data['pre_values']) / len(data['pre_values']) if data['pre_values'] else None,
                    'avg_pst': sum(data['pst_values']) / len(data['pst_values']) if data['pst_values'] else None,
                })
            
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
        Find wells within a radius of a given lat/lon and return their average water level
        GET /api/aquifer/nearby/?latitude=26.91&longitude=75.78&radius=0.1
        """
        lat = request.query_params.get('latitude')
        lon = request.query_params.get('longitude')
        radius_deg = float(request.query_params.get('radius', 0.05)) # ~5km roughly

        if not lat or not lon:
            return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
            return Response({'error': 'Invalid coordinate values'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic bounding box filter - fast enough for SQLite without spatial extensions
        nearby_wells = AquiferData.objects.filter(
            latitude__gte=lat - radius_deg,
            latitude__lte=lat + radius_deg,
            longitude__gte=lon - radius_deg,
            longitude__lte=lon + radius_deg
        )

        if not nearby_wells.exists():
            return Response({
                'count': 0,
                'message': 'No wells found within the specified radius.',
                'averages': None
            })

        # Calculate averages for each year (2015-2024)
        years = range(2015, 2025)
        averages = {}
        
        # Prepare annotation mapping
        agg_map = {}
        for year in years:
            agg_map[f'pre_{year}'] = Avg(f'pre_{year}')
            agg_map[f'pst_{year}'] = Avg(f'pst_{year}')
        
        results = nearby_wells.aggregate(**agg_map)
        
        # Format the output
        for year in years:
            averages[str(year)] = {
                'pre': results[f'pre_{year}'],
                'pst': results[f'pst_{year}']
            }

        return Response({
            'latitude': lat,
            'longitude': lon,
            'count': nearby_wells.count(),
            'radius_deg': radius_deg,
            'averages': averages
        })
