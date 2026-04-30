import numpy as np

def get_parameter_analysis(parameter, values):
    """
    Returns threshold buckets and metadata for a given parameter.
    Adapted to produce buckets compatible with generate_contour_map.
    """
    p = parameter.lower()
    is_quality = p not in ['decadal_pre', 'decadal_pst'] and not p.startswith('pre_') and not p.startswith('pst_')
    unit = 'mg/L' if is_quality else 'm bgl'
    if p == 'ec': unit = 'µS/cm'
    elif p == 'ph': unit = 'pH'

    # Default thresholds
    buckets = []
    if 'ec' in p:
        buckets = [
            {'min': 0, 'max': 500, 'color': '#10b981', 'label': '< 500'},
            {'min': 500, 'max': 1000, 'color': '#34d399', 'label': '500-1000'},
            {'min': 1000, 'max': 1500, 'color': '#6ee7b7', 'label': '1000-1500'},
            {'min': 1500, 'max': 2000, 'color': '#a7f3d0', 'label': '1500-2000'},
            {'min': 2000, 'max': 2500, 'color': '#fef08a', 'label': '2000-2500'},
            {'min': 2500, 'max': 3000, 'color': '#fde047', 'label': '2500-3000'},
            {'min': 3000, 'max': 3500, 'color': '#facc15', 'label': '3000-3500'},
            {'min': 3500, 'max': 4000, 'color': '#fbbf24', 'label': '3500-4000'},
            {'min': 4000, 'max': 4500, 'color': '#f59e0b', 'label': '4000-4500'},
            {'min': 4500, 'max': 5000, 'color': '#f97316', 'label': '4500-5000'},
            {'min': 5000, 'max': 100000, 'color': '#ef4444', 'label': '> 5000'}
        ]
    elif 'nitrate' in p:
        buckets = [
            {'min': 0, 'max': 10, 'color': '#10b981', 'label': '< 10'},
            {'min': 10, 'max': 30, 'color': '#34d399', 'label': '10-30'},
            {'min': 30, 'max': 50, 'color': '#fde047', 'label': '30-50'},
            {'min': 50, 'max': 70, 'color': '#fbbf24', 'label': '50-70'},
            {'min': 70, 'max': 90, 'color': '#f97316', 'label': '70-90'},
            {'min': 90, 'max': 10000, 'color': '#ef4444', 'label': '> 90'}
        ]
    elif 'fluoride' in p:
        buckets = [
            {'min': 0, 'max': 1.5, 'color': '#10b981', 'label': '< 1.5 (Safe)'},
            {'min': 1.5, 'max': 3.0, 'color': '#facc15', 'label': '1.5-3.0'},
            {'min': 3.0, 'max': 10.0, 'color': '#ef4444', 'label': '3.0-10.0'},
            {'min': 10.0, 'max': 25.0, 'color': '#dc2626', 'label': '10.0-25.0'},
            {'min': 25.0, 'max': 50.0, 'color': '#991b1b', 'label': '25.0-50.0'},
            {'min': 50.0, 'max': 100.0, 'color': '#7f1d1d', 'label': '50.0-100.0'},
            {'min': 100.0, 'max': 10000, 'color': '#450a0a', 'label': '> 100.0'}
        ]
    elif 'ph' in p:
        buckets = [
            {'min': 0, 'max': 6.5, 'color': '#ef4444', 'label': '< 6.5'},
            {'min': 6.5, 'max': 7.0, 'color': '#fbbf24', 'label': '6.5-7.0'},
            {'min': 7.0, 'max': 8.5, 'color': '#10b981', 'label': '7.0-8.5'},
            {'min': 8.5, 'max': 9.0, 'color': '#f97316', 'label': '8.5-9.0'},
            {'min': 9.0, 'max': 14.0, 'color': '#ef4444', 'label': '> 9.0'}
        ]
    elif 'tds' in p:
        buckets = [
            {'min': 0, 'max': 500, 'color': '#10b981', 'label': '< 500'},
            {'min': 500, 'max': 1000, 'color': '#34d399', 'label': '500-1000'},
            {'min': 1000, 'max': 1500, 'color': '#fde047', 'label': '1000-1500'},
            {'min': 1500, 'max': 2000, 'color': '#facc15', 'label': '1500-2000'},
            {'min': 2000, 'max': 2500, 'color': '#fbbf24', 'label': '2000-2500'},
            {'min': 2500, 'max': 3000, 'color': '#f97316', 'label': '2500-3000'},
            {'min': 3000, 'max': 100000, 'color': '#ef4444', 'label': '> 3000'}
        ]
    else:
        buckets = [
            {'min': 0, 'max': 5, 'color': '#10b981', 'label': '0-5'},
            {'min': 5, 'max': 10, 'color': '#34d399', 'label': '5-10'},
            {'min': 10, 'max': 20, 'color': '#fde047', 'label': '10-20'},
            {'min': 20, 'max': 40, 'color': '#f97316', 'label': '20-40'},
            {'min': 40, 'max': 500, 'color': '#ef4444', 'label': '> 40'}
        ]
    
    return {
        'buckets': buckets,
        'unit': unit,
        'is_quality': is_quality,
        'parameter': parameter,
        'min': float(np.min(values)) if len(values) > 0 else 0,
        'max': float(np.max(values)) if len(values) > 0 else 10
    }
