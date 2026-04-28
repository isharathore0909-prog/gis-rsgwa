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
        import math

        def safe_float(val):
            if val is None:
                return None
            try:
                val = float(val)
                if math.isnan(val) or math.isinf(val):
                    return None
                return val
            except:
                return None

        x_metric = request.query_params.get('x_metric', 'water_level')
        y_param = request.query_params.get('y_param', 'ec')
        radius_km = float(request.query_params.get('radius_km', 20))
        year = request.query_params.get('year', '2024')
        limit = int(request.query_params.get('limit', 500))
        offset = int(request.query_params.get('offset', 0))

        # ✅ Allowed parameters
        wq_params = [
            'ph', 'hardness', 'alkalinity', 'nitrate', 'fluoride', 'ec', 'tds',
            'iron', 'arsenic', 'uranium', 'calcium', 'magnesium', 'sodium',
            'potassium', 'carbonate', 'bicarbonate', 'sulphate', 'chloride'
        ]

        external_metrics = ['water_level', 'rainfall']
        allowed_x = wq_params + external_metrics

        # ✅ Validation
        if y_param not in wq_params:
            return Response({
                'error': f'Invalid y_param "{y_param}". Must be a water quality parameter.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if x_metric not in allowed_x:
            return Response({
                'error': f'Invalid x_metric "{x_metric}".'
            }, status=status.HTTP_400_BAD_REQUEST)

        # ============================================================
        # ✅ CASE 1: WQ vs WQ
        # ============================================================
        if x_metric in wq_params:
            query = f"""
                SELECT well_id, {y_param}, {x_metric}
                FROM "water_qualityApi_waterquality"
                WHERE {y_param} IS NOT NULL
                AND {x_metric} IS NOT NULL
                ORDER BY meta_date DESC
                LIMIT %s OFFSET %s
            """

            with connection.cursor() as cursor:
                cursor.execute(query, [limit, offset])
                rows = cursor.fetchall()

            data = [
                {
                    'well_id': str(r[0]),
                    'y': safe_float(r[1]),
                    'x': safe_float(r[2]),
                }
                for r in rows
            ]

            return Response({
                'type': 'wq_vs_wq',
                'x_metric': x_metric,
                'y_param': y_param,
                'count': len(data),
                'results': data
            })

        # ============================================================
        # ✅ CASE 2: WATER LEVEL
        # ============================================================
        if x_metric == 'water_level':

            valid_years = [str(y) for y in range(2015, 2025)]
            if year not in valid_years:
                return Response({'error': 'Invalid year (2015-2024 only)'}, status=400)

            query = f"""
                SELECT 
                    wq.well_id,
                    wq.{y_param},
                    aq.pre_{year},
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(aq.longitude, aq.latitude), 4326)::geography
                    )
                FROM "water_qualityApi_waterquality" wq
                CROSS JOIN LATERAL (
                    SELECT latitude, longitude, pre_{year}
                    FROM "aquiferApi_aquiferdata"
                    WHERE pre_{year} IS NOT NULL
                    ORDER BY ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                    <-> ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)
                    LIMIT 1
                ) aq
                WHERE wq.{y_param} IS NOT NULL
                AND wq.latitude IS NOT NULL
                AND wq.longitude IS NOT NULL
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(aq.longitude, aq.latitude), 4326)::geography,
                    %s
                )
                LIMIT %s OFFSET %s
            """

            params = [radius_km * 1000, limit, offset]

        # ============================================================
        # ✅ CASE 3: RAINFALL
        # ============================================================
        elif x_metric == 'rainfall':

            query = f"""
                WITH station_sums AS (
                    SELECT 
                        station_id,
                        SUM(
                            CASE 
                                WHEN rainfall_mm IS NOT NULL 
                                    AND rainfall_mm != 'NaN'::float
                                    AND rainfall_mm != 'Infinity'::float
                                    AND rainfall_mm != '-Infinity'::float
                                THEN rainfall_mm 
                                ELSE 0 
                            END
                        ) AS rainfall_value
                    FROM "rainfallApi_stationrainfall"
                    WHERE date BETWEEN %s AND %s
                    GROUP BY station_id
                )
                SELECT 
                    wq.well_id,
                    wq.{y_param},
                    ss.rainfall_value,
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(rs.longitude, rs.latitude), 4326)::geography
                    )
                FROM "water_qualityApi_waterquality" wq
                CROSS JOIN LATERAL (
                    SELECT id, latitude, longitude
                    FROM "rainfallApi_rainfallstation"
                    ORDER BY ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                    <-> ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)
                    LIMIT 1
                ) rs
                JOIN station_sums ss ON rs.id = ss.station_id
                WHERE wq.{y_param} IS NOT NULL
                AND wq.latitude IS NOT NULL
                AND wq.longitude IS NOT NULL
                AND ss.rainfall_value IS NOT NULL
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(rs.longitude, rs.latitude), 4326)::geography,
                    %s
                )
                LIMIT %s OFFSET %s
            """

            params = [f"{year}-01-01", f"{year}-12-31", radius_km * 1000, limit, offset]

        # ============================================================
        # ✅ EXECUTION
        # ============================================================
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                rows = cursor.fetchall()

            data = [
                {
                    'well_id': str(r[0]),
                    'y': safe_float(r[1]),
                    'x': safe_float(r[2]),
                    'distance_m': round(safe_float(r[3]) or 0, 2)
                }
                for r in rows
            ]

            return Response({
                'type': x_metric,
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