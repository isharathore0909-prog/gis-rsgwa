import math
from django.db import connection
from rest_framework.response import Response
from rest_framework import status

class CorrelationService:
    @staticmethod
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

    @classmethod
    def get_correlation_data(cls, request, queryset_filter_func, get_queryset_func):
        x_metric = request.query_params.get('x_metric', 'water_level')
        y_param = request.query_params.get('y_param', 'ec')
        radius_km = float(request.query_params.get('radius_km', 20))
        year = request.query_params.get('year', '2024')
        limit = int(request.query_params.get('limit', 500))
        offset = int(request.query_params.get('offset', 0))

        # Check for administrative filters
        loc_params = ['district', 'district_id', 'block', 'block_id', 'gp', 'gp_id', 'gramPanchayat', 'village', 'village_id']
        has_loc_filter = any(request.query_params.get(p) for p in loc_params)
        
        village_clause = ""
        village_ids = []
        if has_loc_filter:
            filtered_wq = queryset_filter_func(get_queryset_func())
            village_ids = list(filtered_wq.values_list('village_id', flat=True).exclude(village_id__isnull=True).distinct())
            if not village_ids:
                return {
                    'type': 'correlation', 'x_metric': x_metric, 'y_param': y_param,
                    'count': 0, 'results': []
                }
            village_clause = "AND wq.village_id = ANY(%s)"

        # Allowed parameters
        wq_params = [
            'ph', 'hardness', 'alkalinity', 'nitrate', 'fluoride', 'ec', 'tds',
            'iron', 'arsenic', 'uranium', 'calcium', 'magnesium', 'sodium',
            'potassium', 'carbonate', 'bicarbonate', 'sulphate', 'chloride'
        ]

        external_metrics = ['water_level', 'rainfall']
        allowed_x = wq_params + external_metrics

        # Validation
        if y_param not in wq_params:
            return {'error': f'Invalid y_param "{y_param}". Must be a water quality parameter.', 'status': status.HTTP_400_BAD_REQUEST}

        if x_metric not in allowed_x:
            return {'error': f'Invalid x_metric "{x_metric}".', 'status': status.HTTP_400_BAD_REQUEST}

        # CASE 1: WQ vs WQ
        if x_metric in wq_params:
            filtered_wq = queryset_filter_func(get_queryset_func())
            records = filtered_wq.filter(**{
                f"{y_param}__isnull": False, 
                f"{x_metric}__isnull": False
            }).values('well_id', y_param, x_metric).order_by('-meta_date')[offset:offset+limit]

            data = [
                {
                    'well_id': str(r['well_id']),
                    'y': cls.safe_float(r[y_param]),
                    'x': cls.safe_float(r[x_metric]),
                }
                for r in records
            ]

            return {
                'type': 'wq_vs_wq',
                'x_metric': x_metric,
                'y_param': y_param,
                'count': len(data),
                'results': data
            }

        # CASE 2: WATER LEVEL
        if x_metric == 'water_level':
            valid_years = [str(y) for y in range(2015, 2025)]
            if year not in valid_years:
                return {'error': 'Invalid year (2015-2024 only)', 'status': 400}

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
                {village_clause}
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(aq.longitude, aq.latitude), 4326)::geography,
                    %s
                )
                LIMIT %s OFFSET %s
            """

            sql_params = []
            if has_loc_filter:
                sql_params.append(village_ids)
            sql_params.extend([radius_km * 1000, limit, offset])

        # CASE 3: RAINFALL
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
                {village_clause}
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(wq.longitude, wq.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(rs.longitude, rs.latitude), 4326)::geography,
                    %s
                )
                LIMIT %s OFFSET %s
            """

            sql_params = [f"{year}-01-01", f"{year}-12-31"]
            if has_loc_filter:
                sql_params.append(village_ids)
            sql_params.extend([radius_km * 1000, limit, offset])

        # EXECUTION
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, sql_params)
                rows = cursor.fetchall()

            data = [
                {
                    'well_id': str(r[0]),
                    'y': cls.safe_float(r[1]),
                    'x': cls.safe_float(r[2]),
                    'distance_m': round(cls.safe_float(r[3]) or 0, 2)
                }
                for r in rows
            ]

            return {
                'type': x_metric,
                'x_metric': x_metric,
                'y_param': y_param,
                'year': year,
                'count': len(data),
                'results': data
            }

        except Exception as e:
            return {'error': str(e), 'status': status.HTTP_500_INTERNAL_SERVER_ERROR}
