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
    def get_correlation_matrix_data(cls, request, queryset_filter_func, get_queryset_func):
        metrics = request.query_params.getlist('metrics[]')
        if not metrics:
            metrics = ['ph', 'tds', 'ec', 'hardness', 'nitrate', 'fluoride']
        
        limit = int(request.query_params.get('limit', 1000))
        include_points = request.query_params.get('include_points', 'true').lower() == 'true'
        
        # 1. Fetch data for all metrics using iterator for efficiency
        filtered_wq = queryset_filter_func(get_queryset_func())
        query_fields = [
            'well_id', 'site_name',
            'village__name',
            'village__grampanchayat__block__district__name'
        ] + [m for m in metrics if m not in ['water_level', 'rainfall']]
        query = filtered_wq.values(*query_fields)
        
        # Prepare data structure for alignment
        well_data = {} # {well_id: {metric: value}}
        
        # Use iterator to handle memory pressure if table grows
        for row in query.iterator(chunk_size=2000):
            wid = str(row['well_id'])
            if wid not in well_data:
                well_data[wid] = {
                    'well_id': wid,
                    'site_name': row.get('site_name'),
                    'village': row.get('village__name'),
                    'district': row.get('village__grampanchayat__block__district__name')
                }
            for m in metrics:
                if m in row:
                    val = cls.safe_float(row[m])
                    if val is not None:
                        well_data[wid][m] = val

        # 2. Convert well_data to a list of aligned points
        aligned_points = []
        for wid, values in well_data.items():
            if len(values) >= 2: # Need at least 2 metrics to be useful
                aligned_points.append(values)
        
        # 3. Calculate Correlation Matrix (Pearson)
        matrix = {}
        for m1 in metrics:
            matrix[m1] = {}
            for m2 in metrics:
                if m1 == m2:
                    matrix[m1][m2] = 1.0
                    continue
                
                # Get pairs where both exist
                pairs = [(p[m1], p[m2]) for p in aligned_points if m1 in p and m2 in p]
                if len(pairs) < 5:
                    matrix[m1][m2] = None
                    continue
                
                x = [p[0] for p in pairs]
                y = [p[1] for p in pairs]
                
                # Pearson 
                n = len(pairs)
                sum_x = sum(x)
                sum_y = sum(y)
                sum_x2 = sum(i*i for i in x)
                sum_y2 = sum(i*i for i in y)
                sum_xy = sum(i*j for i, j in pairs)
                
                denominator = math.sqrt(((n * sum_x2) - (sum_x**2)) * ((n * sum_y2) - (sum_y**2)))
                if denominator == 0:
                    matrix[m1][m2] = 0
                else:
                    matrix[m1][m2] = round(((n * sum_xy) - (sum_x * sum_y)) / denominator, 3)

        # 4. Generate Histogram data
        histograms = {}
        for m in metrics:
            vals = [p[m] for p in aligned_points if m in p]
            if not vals:
                histograms[m] = []
                continue
            
            min_v, max_v = min(vals), max(vals)
            bins_count = 10
            bin_size = (max_v - min_v) / bins_count if max_v > min_v else 1
            bins = [0] * bins_count
            for v in vals:
                idx = min(int((v - min_v) / bin_size), bins_count - 1) if bin_size > 0 else 0
                bins[idx] += 1
            
            histograms[m] = {
                'bins': bins,
                'min': round(min_v, 2), 'max': round(max_v, 2), 'bin_size': round(bin_size, 2)
            }

        return {
            'metrics': metrics,
            'matrix': matrix,
            'histograms': histograms,
            'data_points': aligned_points[:limit] if include_points else [],
            'count': len(aligned_points)
        }

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
                    'count': 0, 'results': [], 'regression': None
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

            from .utils import calculate_regression
            points = [[cls.safe_float(r[x_metric]), cls.safe_float(r[y_param])] for r in records if r[x_metric] is not None and r[y_param] is not None]
            regression = calculate_regression(points)

            return {
                'type': 'wq_vs_wq',
                'x_metric': x_metric,
                'y_param': y_param,
                'count': len(data),
                'results': data,
                'regression': regression
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

            from .utils import calculate_regression
            points = [[cls.safe_float(r[2]), cls.safe_float(r[1])] for r in rows if r[2] is not None and r[1] is not None]
            regression = calculate_regression(points)

            return {
                'type': x_metric,
                'x_metric': x_metric,
                'y_param': y_param,
                'year': year,
                'count': len(data),
                'results': data,
                'regression': regression
            }

        except Exception as e:
            return {'error': str(e), 'status': status.HTTP_500_INTERNAL_SERVER_ERROR}

    @classmethod
    def get_dashboard_correlations(cls, queryset):
        """
        Calculate correlations specifically for the dashboard components.
        - EC vs TDS
        - (Calcium + Magnesium) vs Hardness
        """
        from .utils import calculate_regression
        
        # 1. Fetch relevant fields
        data = queryset.values('ec', 'tds', 'calcium', 'magnesium', 'hardness')
        
        ec_tds_points = []
        hardness_points = []
        
        for r in data:
            # EC vs TDS
            ec = cls.safe_float(r.get('ec'))
            tds = cls.safe_float(r.get('tds'))
            if ec is not None and tds is not None:
                ec_tds_points.append([ec, tds])
            
            # (Ca + Mg) vs Hardness
            calcium = cls.safe_float(r.get('calcium'))
            magnesium = cls.safe_float(r.get('magnesium'))
            hardness = cls.safe_float(r.get('hardness'))
            
            if hardness is not None and (calcium is not None or magnesium is not None):
                ca_mg_sum = (calcium or 0) + (magnesium or 0)
                hardness_points.append([ca_mg_sum, hardness])
        
        return {
            'ec_vs_tds': calculate_regression(ec_tds_points),
            'ca_mg_vs_hardness': calculate_regression(hardness_points)
        }
