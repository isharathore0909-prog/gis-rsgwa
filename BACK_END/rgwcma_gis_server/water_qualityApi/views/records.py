from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q

from ..models import WaterQuality
from ..serializers import WaterQualitySerializer, WaterQualityListSerializer, WaterQualityMapSerializer
from ..utils import calculate_wqi, check_quality_status, calculate_water_quality_stats

from core.filters import HierarchicalLocationFilterBackend
from core.services.cache_utils import build_cache_key
from django.core.cache import cache
from django.db import connection

class WaterQualityViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for Water Quality records with optimized filtering and performance.
    """
    queryset = WaterQuality.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = ['type_of_well', 'meta_date', 'village']
    search_fields = ['well_id', 'village__name']
    ordering_fields = ['meta_date', 'ph', 'tds', 'well_id']
    ordering = ['-meta_date']

    def get_serializer_class(self):
        if self.action == 'list':
            if self.request.query_params.get('map_markers') == 'true':
                return WaterQualityMapSerializer
            if self.request.query_params.get('detailed') == 'true':
                return WaterQualitySerializer
            return WaterQualityListSerializer
        return WaterQualitySerializer

    def list(self, request, *args, **kwargs):
        # 1. Optimize List Fetching with Caching
        cache_key = build_cache_key("wq_list", request)
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res)
        
        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            cache.set(cache_key, response.data, 3600)
        return response

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('map_markers') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if self.request.query_params.get('map_markers') == 'true':
                return queryset.select_related('village').only('id', 'well_id', 'latitude', 'longitude', 'village__name', 'ph', 'tds')
            return queryset.select_related('village__grampanchayat__block__district__state')
        if self.action == 'retrieve':
            return queryset.select_related('village__grampanchayat__block__district__state')
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        cache_key = build_cache_key("wq_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        summary = calculate_water_quality_stats(queryset, WaterQuality)
        wqi_data = calculate_wqi(summary)
        quality_status = check_quality_status(summary)
        well_types = queryset.values('type_of_well').annotate(count=Count('id')).order_by('-count')
        res = {'summary': summary, 'wqi': wqi_data, 'status': quality_status, 'well_type_distribution': list(well_types)}
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'])
    def availability_statistics(self, request):
        cache_key = build_cache_key("wq_availability_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        pre_filter, post_filter = Q(meta_date__month__in=[5, 6]), Q(meta_date__month__in=[10, 11])
        agg_params = {
            'total_records': Count('id'),
            'avg_pre_ph': Avg('ph', filter=pre_filter), 'avg_post_ph': Avg('ph', filter=post_filter),
            'avg_pre_tds': Avg('tds', filter=pre_filter), 'avg_post_tds': Avg('tds', filter=post_filter),
            'avg_pre_hardness': Avg('hardness', filter=pre_filter), 'avg_post_hardness': Avg('hardness', filter=post_filter),
            'avg_pre_alkalinity': Avg('alkalinity', filter=pre_filter), 'avg_post_alkalinity': Avg('alkalinity', filter=post_filter),
            'avg_pre_nitrate': Avg('nitrate', filter=pre_filter), 'avg_post_nitrate': Avg('nitrate', filter=post_filter),
            'avg_pre_fluoride': Avg('fluoride', filter=pre_filter), 'avg_post_fluoride': Avg('fluoride', filter=post_filter),
        }
        stats = queryset.aggregate(**agg_params)
        summary = {k: (round(v or 0, 2) if k.startswith('avg_') else (v or 0)) for k, v in stats.items()}
        res = {'summary': summary}
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        level = request.query_params.get('level', 'district')
        cache_key = build_cache_key(f"wq_by_loc_{level}", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset())
        if level == 'district':
            data = queryset.values('village__grampanchayat__block__district__name').annotate(count=Count('id'), avg_ph=Avg('ph'), avg_tds=Avg('tds')).order_by('-count')
            res = {'level': 'district', 'data': list(data)}
        elif level == 'block':
            data = queryset.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name').annotate(count=Count('id'), avg_ph=Avg('ph'), avg_tds=Avg('tds')).order_by('-count')
            res = {'level': 'block', 'data': list(data)}
        else: return Response({'error': 'Invalid level parameter. Use "district" or "block".'}, status=status.HTTP_400_BAD_REQUEST)
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'])
    def correlation(self, request):
        """
        Perform high-performance spatial join between Water Quality and other metrics (Water Level, Rainfall).
        Uses PostGIS ST_Distance to find the nearest measurement within a specified radius.
        """
        x_metric = request.query_params.get('x_metric', 'water_level')
        y_param = request.query_params.get('y_param', 'ec')
        radius_km = float(request.query_params.get('radius_km', 20))
        year = request.query_params.get('year', '2024')
        limit = int(request.query_params.get('limit', 500))
        offset = int(request.query_params.get('offset', 0))
        
        # Validate y_param to prevent SQL injection
        allowed_params = ['ph', 'hardness', 'alkalinity', 'nitrate', 'fluoride', 'ec', 'tds', 'iron', 'arsenic', 'uranium']
        if y_param not in allowed_params:
            return Response({'error': f'Invalid y_param. Must be one of: {", ".join(allowed_params)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Target table and value column logic
        # ... (keep existing logic) ...
        # Optimized KNN spatial join
        # For water_level, we hit the table directly to use the "aquifer_spatial_idx"
        # For rainfall, we pre-aggregate station data in a CTE and JOIN it inside the lateral part
        # to ensure the spatial part can still hit the "rainfall_station_spatial_idx"
        cte = ""
        if x_metric == 'water_level':
            target_table_expr = '"aquiferApi_aquiferdata"'
            target_value_col = f"pre_{year}"
            
            # Validation
            valid_years = [str(y) for y in range(2015, 2025)]
            if year not in valid_years:
                return Response({'error': f'Invalid year. Support 2015-2024.'}, status=status.HTTP_400_BAD_REQUEST)
        
        elif x_metric == 'rainfall':
            # Use date range instead of EXTRACT(YEAR) to hit the index on 'date'
            cte = f"""
                WITH station_sums AS (
                    SELECT 
                        station_id,
                        SUM(rainfall_mm) as rainfall_value
                    FROM "rainfallApi_stationrainfall"
                    WHERE date >= '{year}-01-01' AND date <= '{year}-12-31'
                    GROUP BY station_id
                )
            """
            # Use the existing 'geometry' column if possible, but keep fallback to functional index
            target_table_expr = """
                "rainfallApi_rainfallstation" rs
                JOIN station_sums ss ON rs.id = ss.station_id
            """
            target_value_col = "ss.rainfall_value"
        else:
            return Response({'error': 'Unsupported x_metric. Use "water_level" or "rainfall".'}, status=status.HTTP_400_BAD_REQUEST)

        query = f"""
            {cte}
            SELECT 
                wq.well_id,
                wq.{y_param} as y_value,
                target_join.target_value as x_value,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(target_join.longitude, target_join.latitude), 4326)::geography
                ) as distance_m,
                wq.latitude, wq.longitude,
                target_join.latitude as target_lat, target_join.longitude as target_lon,
                wq.meta_date
            FROM (
                SELECT * FROM "water_qualityApi_waterquality"
                WHERE {y_param} IS NOT NULL
                  AND longitude IS NOT NULL
                  AND latitude IS NOT NULL
                ORDER BY meta_date DESC
                LIMIT {limit} OFFSET {offset}
            ) wq
            CROSS JOIN LATERAL (
                SELECT {target_value_col} as target_value, latitude, longitude
                FROM {target_table_expr}
                ORDER BY ST_SetSRID(ST_MakePoint(rs.longitude, rs.latitude), 4326) <-> ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)
                IF {x_metric == 'water_level'} -- Just a reminder of logic
                LIMIT 1
            ) target_join -- Renamed for clarity
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(target_join.longitude, target_join.latitude), 4326)::geography,
                {radius_km * 1000}
            )
            ORDER BY distance_m ASC
        """
        
        # Clean up the query string logic (remove my reminder comment)
        if x_metric == 'water_level':
            # Rewrite for water_level to be clean
            query = f"""
                SELECT 
                    wq.well_id,
                    wq.{y_param} as y_value,
                    target.target_value as x_value,
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(target.longitude, target.latitude), 4326)::geography
                    ) as distance_m,
                    wq.latitude, wq.longitude,
                    target.latitude as target_lat, target.longitude as target_lon,
                    wq.meta_date
                FROM (
                    SELECT * FROM "water_qualityApi_waterquality"
                    WHERE {y_param} IS NOT NULL
                      AND longitude IS NOT NULL
                      AND latitude IS NOT NULL
                    ORDER BY meta_date DESC
                    LIMIT {limit} OFFSET {offset}
                ) wq
                CROSS JOIN LATERAL (
                    SELECT {target_value_col} as target_value, latitude, longitude
                    FROM {target_table_expr}
                    WHERE {target_value_col} IS NOT NULL
                      AND longitude IS NOT NULL
                      AND latitude IS NOT NULL
                    ORDER BY ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) <-> ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)
                    LIMIT 1
                ) target
                WHERE ST_DWithin(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(target.longitude, target.latitude), 4326)::geography,
                    {radius_km * 1000}
                )
                ORDER BY distance_m ASC
            """
        else:
             # Final check for rainfall query formatting:
             # We use a nested subquery to find the nearest station ID FIRST (hitting the index)
             # Then join with the pre-calculated sums.
             query = f"""
                {cte}
                SELECT 
                    wq.well_id,
                    wq.{y_param} as y_value,
                    target.target_value as x_value,
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(target.longitude, target.latitude), 4326)::geography
                    ) as distance_m,
                    wq.latitude, wq.longitude,
                    target.latitude as target_lat, target.longitude as target_lon,
                    wq.meta_date
                FROM (
                    SELECT * FROM "water_qualityApi_waterquality"
                    WHERE {y_param} IS NOT NULL
                      AND longitude IS NOT NULL
                      AND latitude IS NOT NULL
                    ORDER BY meta_date DESC
                    LIMIT {limit} OFFSET {offset}
                ) wq
                CROSS JOIN LATERAL (
                    SELECT ss.rainfall_value as target_value, rs_best.latitude, rs_best.longitude
                    FROM (
                        SELECT id, latitude, longitude
                        FROM "rainfallApi_rainfallstation"
                        ORDER BY ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) <-> ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)
                        LIMIT 1
                    ) rs_best
                    JOIN station_sums ss ON rs_best.id = ss.station_id
                ) target
                WHERE ST_DWithin(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(target.longitude, target.latitude), 4326)::geography,
                    {radius_km * 1000}
                )
                ORDER BY distance_m ASC
             """

        try:
            with connection.cursor() as cursor:
                cursor.execute(query)
                rows = cursor.fetchall()
                
            data = []
            for row in rows:
                # Ensure all values are JSON serializable (convert Decimal/Date)
                data.append({
                    'well_id': str(row[0]),
                    'y': float(row[1]) if row[1] is not None else None,
                    'x': float(row[2]) if row[2] is not None else None,
                    'distance_m': round(float(row[3]), 2),
                    'coords': [float(row[4]), float(row[5])],
                    'target_coords': [float(row[6]), float(row[7])],
                    'date': row[8].isoformat() if hasattr(row[8], 'isoformat') else str(row[8]) if row[8] else None,
                })
            
            return Response({
                'x_metric': x_metric,
                'y_param': y_param,
                'year': year,
                'count': len(data),
                'results': data
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
