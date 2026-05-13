from django.db.models import Avg, Count, Q

WATER_QUALITY_LIMITS = {
    'ph': {'min': 6.5, 'max': 8.5},
    'ec': 3000,
    'fluoride': 1.5,
    'nitrate': 45,
    'iron': 1.0,
    'arsenic': 10,
    'uranium': 30,
    'tds': 2000,
    'chloride': 1000,
    'hardness': 600
}

def calculate_wqi(data):
    """
    Calculate Water Quality Index (WQI) and classification.
    Weighted average of parameters relative to their safe limits.
    """
    weights = {
        'ec': 0.15, 'fluoride': 0.15, 'nitrate': 0.15, 'iron': 0.10,
        'arsenic': 0.15, 'uranium': 0.10, 'tds': 0.10, 'ph': 0.05, 'chloride': 0.05
    }

    limits = {
        'ec': 3000, 'fluoride': 1.5, 'nitrate': 45, 'iron': 1.0,
        'arsenic': 10, 'uranium': 30, 'tds': 2000, 'ph': 7.0, 'chloride': 1000
    }

    wqi, total_weight = 0, 0
    for param, weight in weights.items():
        val = data.get(param) or data.get(f'avg_{param}')
        if val is not None:
            limit = limits[param]
            qi = abs(val - 7.0) / 1.5 * 100 if param == 'ph' else (val / limit) * 100
            wqi += qi * weight
            total_weight += weight

    if total_weight == 0: return None
    final_wqi = wqi / total_weight
    
    if final_wqi < 50: classification = 'Excellent'
    elif final_wqi < 100: classification = 'Good'
    elif final_wqi < 200: classification = 'Poor'
    elif final_wqi < 300: classification = 'Very Poor'
    else: classification = 'Unsuitable'

    return {'value': round(final_wqi), 'classification': classification}

def check_quality_status(data):
    """
    Check water quality status and identify issues based on WATER_QUALITY_LIMITS.
    """
    issues = []
    param_map = {
        'ec': 'High EC', 'fluoride': 'High Fluoride', 'nitrate': 'High Nitrate',
        'iron': 'High Iron', 'arsenic': 'High Arsenic', 'uranium': 'High Uranium',
        'tds': 'High TDS', 'chloride': 'High Chloride', 'hardness': 'High Hardness'
    }

    for param, label in param_map.items():
        val = data.get(param) or data.get(f'avg_{param}')
        if val is not None and val > WATER_QUALITY_LIMITS[param]:
            issues.append(label)

    ph_val = data.get('ph') or data.get('avg_ph')
    if ph_val is not None:
        if ph_val < WATER_QUALITY_LIMITS['ph']['min'] or ph_val > WATER_QUALITY_LIMITS['ph']['max']:
            issues.append('pH out of range')

    if not issues:
        return {'status': 'good', 'class': 'good', 'text': 'Good Quality', 'issues': []}
    elif len(issues) <= 2:
        return {'status': 'warning', 'class': 'warning', 'text': 'Moderate Quality', 'issues': issues}
    else:
        return {'status': 'critical', 'class': 'critical', 'text': 'Poor Quality', 'issues': issues}

def calculate_water_quality_stats(queryset, model):
    """
    Consolidated water quality aggregations.
    """
    aggregation_params = {
        'total_wells': Count('well_id', distinct=True),
        'total_records': Count('id'),
        'avg_ph': Avg('ph'),
        'avg_hardness': Avg('hardness'),
        'avg_alkalinity': Avg('alkalinity'),
        'avg_nitrate': Avg('nitrate'),
        'avg_fluoride': Avg('fluoride'),
        'avg_ec': Avg('ec'),
        'avg_tds': Avg('tds'),
        # Exceedance counts based on standard limits
        'ec_exceedance': Count('id', filter=Q(ec__gt=WATER_QUALITY_LIMITS['ec'])),
        'fluoride_exceedance': Count('id', filter=Q(fluoride__gt=WATER_QUALITY_LIMITS['fluoride'])),
        'nitrate_exceedance': Count('id', filter=Q(nitrate__gt=WATER_QUALITY_LIMITS['nitrate'])),
        'hardness_exceedance': Count('id', filter=Q(hardness__gt=WATER_QUALITY_LIMITS['hardness'])),
        'tds_exceedance': Count('id', filter=Q(tds__gt=WATER_QUALITY_LIMITS['tds'])),
    }

    # Optional fields
    optional_fields = {
        'iron': (Avg('iron'), Count('id', filter=Q(iron__gt=WATER_QUALITY_LIMITS['iron']))),
        'arsenic': (Avg('arsenic'), Count('id', filter=Q(arsenic__gt=WATER_QUALITY_LIMITS['arsenic']))),
        'uranium': (Avg('uranium'), Count('id', filter=Q(uranium__gt=WATER_QUALITY_LIMITS['uranium']))),
        'chloride': (Avg('chloride'), Count('id', filter=Q(chloride__gt=WATER_QUALITY_LIMITS['chloride']))),
        'calcium': (Avg('calcium'), Count('id', filter=Q(calcium__gt=200))), # 200 mg/L limit
        'magnesium': (Avg('magnesium'), Count('id', filter=Q(magnesium__gt=100))), # 100 mg/L limit
        'sodium': (Avg('sodium'), Count('id', filter=Q(sodium__gt=200))), # 200 mg/L limit
        'potassium': (Avg('potassium'), Count('id', filter=Q(potassium__gt=12))), # 12 mg/L limit
        'carbonate': (Avg('carbonate'), Count('id', filter=Q(carbonate__gt=100))),
        'bicarbonate': (Avg('bicarbonate'), Count('id', filter=Q(bicarbonate__gt=400))),
        'sulphate': (Avg('sulphate'), Count('id', filter=Q(sulphate__gt=400))),
    }

    for field, (avg_agg, exc_agg) in optional_fields.items():
        try:
            model._meta.get_field(field)
            aggregation_params[f'avg_{field}'] = avg_agg
            # Ensure name matches frontend expectation (no count_ prefix)
            aggregation_params[f'{field}_exceedance'] = exc_agg
        except: pass

    stats = queryset.aggregate(**aggregation_params)
    
    summary = {}
    for k, v in stats.items():
        if k.startswith('avg_'): summary[k] = round(v or 0, 2)
        else: summary[k] = v or 0
        
    return summary

def calculate_regression(points):
    """
    Calculates slope, intercept and R-squared for a list of [x, y] points.
    Returns projection points for the min/max X values.
    """
    import math
    if not points or len(points) < 2:
        return None
    
    try:
        n = len(points)
        sum_x = sum(p[0] for p in points)
        sum_y = sum(p[1] for p in points)
        sum_xy = sum(p[0] * p[1] for p in points)
        sum_x2 = sum(p[0]**2 for p in points)
        sum_y2 = sum(p[1]**2 for p in points)
        
        denominator = (n * sum_x2 - sum_x**2)
        if denominator == 0:
            return None
            
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n
        
        # R-squared
        r_num = (n * sum_xy - sum_x * sum_y)
        r_den_sq = (n * sum_x2 - sum_x**2) * (n * sum_y2 - sum_y**2)
        r_squared = (r_num**2 / r_den_sq) if r_den_sq > 0 else 0
        
        x_values = [p[0] for p in points]
        min_x = min(x_values)
        max_x = max(x_values)
        
        return {
            'slope': round(slope, 4),
            'intercept': round(intercept, 4),
            'r_squared': round(r_squared, 3),
            'line_points': [[min_x, slope * min_x + intercept], [max_x, slope * max_x + intercept]]
        }
    except Exception as e:
        print(f"Regression error: {e}")
        return None
