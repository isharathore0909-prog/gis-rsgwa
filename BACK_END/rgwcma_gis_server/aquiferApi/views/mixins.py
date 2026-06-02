from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Count
from django.core.cache import cache
from core.services.cache_utils import build_cache_key
from ..utils import calculate_aquifer_stats, calculate_aquifer_yearly_trends
from ..serializers import YearDataSerializer
from ..models import AquiferData

class AquiferStatsMixin:
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
        data = queryset.exclude(
            village__grampanchayat__block__district__name__isnull=True
        ).values(
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
            for d in data
            if d['village__grampanchayat__block__district__name']
            and str(d['village__grampanchayat__block__district__name']).lower() not in ('nan', 'n/a', '-', 'none')
        ]
        
        final_response = {'level': 'district', 'year': year, 'data': result}
        cache.set(cache_key, final_response, 3600)
        return Response(final_response)

class AquiferAnalysisMixin:
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
    def decadal_analysis(self, request):
        """
        Get decadal change analysis (2015-2024) grouped by range and sub-location with caching.
        """
        cache_key = build_cache_key("aquifer_decadal", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        # Manual filtering for robustness in this custom action
        queryParams = request.query_params
        queryset = self.get_queryset()

        # Helper to normalize common spelling duplicates in the master data
        def normalize_name(name):
            if not name: return name
            n = str(name).strip().upper()
            mapping = {
                'SHRINAGAR': 'SRINAGAR',
                'SRINAGAR': 'SRINAGAR',
                # Add more mappings here if other duplicates are found
            }
            return mapping.get(n, name)
        
        # 1. Apply hierarchal filters manually
        district = queryParams.get('district_id') or queryParams.get('district')
        if district:
            if str(district).isdigit():
                queryset = queryset.filter(village__grampanchayat__block__district_id=district)
            else:
                queryset = queryset.filter(village__grampanchayat__block__district__name__iexact=district)
                
        block = queryParams.get('block_id') or queryParams.get('block')
        if block:
            if str(block).isdigit():
                queryset = queryset.filter(village__grampanchayat__block_id=block)
            else:
                # Try original name AND normalized version to catch duplicates
                norm_block = normalize_name(block)
                if norm_block != block:
                    from django.db.models import Q
                    queryset = queryset.filter(Q(village__grampanchayat__block__name__iexact=block) | Q(village__grampanchayat__block__name__iexact=norm_block))
                else:
                    queryset = queryset.filter(village__grampanchayat__block__name__iexact=block)
                
        gp = queryParams.get('gp_id') or queryParams.get('grampanchayat_id') or queryParams.get('grampanchayat') or queryParams.get('gram_panchayat')
        if gp:
            if str(gp).isdigit():
                queryset = queryset.filter(village__grampanchayat_id=gp)
            else:
                queryset = queryset.filter(village__grampanchayat__name__iexact=gp)
                
        village = queryParams.get('village_id') or queryParams.get('village') or queryParams.get('village_name')
        if village:
            if str(village).isdigit():
                queryset = queryset.filter(village_id=village)
            else:
                queryset = queryset.filter(village__name__iexact=village)
                
        # 2. Add aquifer filter if present (standard in list view)
        aquifer = queryParams.get('aquifer')
        if aquifer:
            queryset = queryset.filter(aquifer__iexact=aquifer)
        
        # Use values() to fetch only needed fields for efficiency
        data = queryset.values(
            'id', 'well_id', 
            'pre_2015', 'pre_2024', 
            'pst_2015', 'pst_2024',
            'village__grampanchayat__block__name',
            'village__grampanchayat__name',
            'village__name'
        )
        
        # Determine grouping level based on active filters
        is_village = request.query_params.get('village_id') or request.query_params.get('village')
        is_gp = request.query_params.get('grampanchayat_id') or request.query_params.get('grampanchayat') or request.query_params.get('gp_id')
        is_block = request.query_params.get('block_id') or request.query_params.get('block')
        is_district = request.query_params.get('district_id') or request.query_params.get('district')
        
        if is_gp or is_village:
            group_field = 'village__name'
        elif is_block:
            group_field = 'village__grampanchayat__name'
        elif is_district:
            group_field = 'village__grampanchayat__block__name'
        else:
            group_field = 'village__grampanchayat__block__district__name'
            
        ranges = [
            {'label': '<-7', 'min': -float('inf'), 'max': -7},
            {'label': '-5 to -7', 'min': -7, 'max': -5},
            {'label': '-3 to -5', 'min': -5, 'max': -3},
            {'label': '-1 to -3', 'min': -3, 'max': -1},
            {'label': '0 to -1', 'min': -1, 'max': 0},
            {'label': '0 to 1', 'min': 0, 'max': 1},
            {'label': '1 to 3', 'min': 1, 'max': 3},
            {'label': '3 to 5', 'min': 3, 'max': 5},
            {'label': '5 to 7', 'min': 5, 'max': 7},
            {'label': '>7', 'min': 7, 'max': float('inf')}
        ]
        
        distribution = {r['label']: {'pre': 0, 'pst': 0} for r in ranges}
        trends = {}
        
        for item in data:
            # Pre-monsoon Decadal Change
            if item['pre_2015'] is not None and item['pre_2024'] is not None:
                diff = item['pre_2015'] - item['pre_2024'] # +ve is rise, -ve is depletion
                for r in ranges:
                    if (r['min'] <= diff < r['max']) if r['max'] != float('inf') else (diff >= r['min']):
                        distribution[r['label']]['pre'] += 1
                        break
                
                # Trend collection (based on pre-monsoon as requested)
                loc_name = item.get(group_field) or 'Rajasthan'
                if loc_name not in trends: trends[loc_name] = {'rise': 0, 'depletion': 0}
                if diff >= 0: trends[loc_name]['rise'] += 1
                else: trends[loc_name]['depletion'] += 1
 
            # Post-monsoon Decadal Change
            if item['pst_2015'] is not None and item['pst_2024'] is not None:
                diff = item['pst_2015'] - item['pst_2024']
                for r in ranges:
                    if (r['min'] <= diff < r['max']) if r['max'] != float('inf') else (diff >= r['min']):
                        distribution[r['label']]['pst'] += 1
                        break
        
        # Formatting results
        dist_result = [{'range': r['label'], 'pre': distribution[r['label']]['pre'], 'pst': distribution[r['label']]['pst']} for r in ranges]
        trend_result = sorted([{'location': loc, 'rise': v['rise'], 'depletion': v['depletion']} for loc, v in trends.items()], key=lambda x: x['location'])
 
        # Multi-stage count for debugging
        wells_with_pre = sum(1 for item in data if item.get('pre_2015') is not None and item.get('pre_2024') is not None)
        wells_with_pst = sum(1 for item in data if item.get('pst_2015') is not None and item.get('pst_2024') is not None)
 
        res = {
            'distribution': dist_result,
            'trends': trend_result,
            'metadata': {
                'total_wells': len(data),
                'total_in_db': AquiferData.objects.all().count(),
                'applied_filters': {
                    'district': queryParams.get('district') or queryParams.get('district_id'),
                    'block': queryParams.get('block') or queryParams.get('block_id'),
                    'gp': queryParams.get('grampanchayat') or queryParams.get('gp_id'),
                    'village': queryParams.get('village') or queryParams.get('village_id')
                },
                'wells_with_pre': wells_with_pre,
                'wells_with_pst': wells_with_pst,
                'group_level': group_field.split('__')[-2] if '__' in group_field else 'village'
            }
        }
        cache.set(cache_key, res, 3600)
        return Response(res)

class AquiferSpatialMixin:
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
            from core.geo_utils import spatial_nearby
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
