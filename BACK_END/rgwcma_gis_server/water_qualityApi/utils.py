def calculate_wqi(data):
    """
    Calculate Water Quality Index (WQI) and classification.
    Weighted average of parameters relative to their safe limits.
    """
    weights = {
        'ec': 0.15,
        'fluoride': 0.15,
        'nitrate': 0.15,
        'iron': 0.10,
        'arsenic': 0.15,
        'uranium': 0.10,
        'tds': 0.10,
        'ph': 0.05,
        'chloride': 0.05
    }

    limits = {
        'ec': 3000,
        'fluoride': 1.5,
        'nitrate': 45,
        'iron': 1.0,
        'arsenic': 10,
        'uranium': 30,
        'tds': 2000,
        'ph': 7.0,
        'chloride': 1000
    }

    wqi = 0
    total_weight = 0

    for param, weight in weights.items():
        val = data.get(param) or data.get(f'avg_{param}')
        if val is not None:
            limit = limits[param]
            if param == 'ph':
                # pH has optimal range around 7.0
                qi = abs(val - 7.0) / 1.5 * 100
            else:
                qi = (val / limit) * 100

            wqi += qi * weight
            total_weight += weight

    if total_weight == 0:
        return None

    final_wqi = wqi / total_weight
    
    # Classify WQI
    if final_wqi < 50: classification = 'Excellent'
    elif final_wqi < 100: classification = 'Good'
    elif final_wqi < 200: classification = 'Poor'
    elif final_wqi < 300: classification = 'Very Poor'
    else: classification = 'Unsuitable'

    return {
        'value': round(final_wqi),
        'classification': classification
    }

def check_quality_status(data):
    """
    Check water quality status and identify issues.
    """
    limits = {
        'ec': 3000,
        'fluoride': 1.5,
        'nitrate': 45,
        'iron': 1.0,
        'arsenic': 10,
        'uranium': 30,
        'tds': 2000,
        'ph': {'min': 6.5, 'max': 8.5},
        'chloride': 1000,
        'hardness': 600
    }

    issues = []
    
    # Check each parameter
    param_map = {
        'ec': 'High EC',
        'fluoride': 'High Fluoride',
        'nitrate': 'High Nitrate',
        'iron': 'High Iron',
        'arsenic': 'High Arsenic',
        'uranium': 'High Uranium',
        'tds': 'High TDS',
        'chloride': 'High Chloride',
        'hardness': 'High Hardness'
    }

    for param, label in param_map.items():
        val = data.get(param) or data.get(f'avg_{param}')
        if val is not None and val > limits[param]:
            issues.append(label)

    # pH Special check
    ph_val = data.get('ph') or data.get('avg_ph')
    if ph_val is not None:
        if ph_val < limits['ph']['min'] or ph_val > limits['ph']['max']:
            issues.append('pH out of range')

    if not issues:
        return {'status': 'good', 'class': 'good', 'text': 'Good Quality', 'issues': []}
    elif len(issues) <= 2:
        return {'status': 'warning', 'class': 'warning', 'text': 'Moderate Quality', 'issues': issues}
    else:
        return {'status': 'critical', 'class': 'critical', 'text': 'Poor Quality', 'issues': issues}
