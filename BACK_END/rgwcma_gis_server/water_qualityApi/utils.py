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
    }

    for field, (avg_agg, exc_agg) in optional_fields.items():
        try:
            model._meta.get_field(field)
            aggregation_params[f'avg_{field}'] = avg_agg
            aggregation_params[f'count_{field}_exceedance'] = exc_agg # Rename for clarity
        except: pass

    stats = queryset.aggregate(**aggregation_params)
    
    summary = {}
    for k, v in stats.items():
        if k.startswith('avg_'): summary[k] = round(v or 0, 2)
        else: summary[k] = v or 0
        
    return summary
