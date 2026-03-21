from django.db.models import Avg, Max, Min, Count

def calculate_aquifer_stats(year, queryset):
    """
    Consolidate aquifer aggregations into a single DB scan.
    """
    pre_field = f'pre_{year}'
    pst_field = f'pst_{year}'
    years = range(2015, 2025)
    
    agg_map = {
        'total_wells': Count('id'),
        'wells_with_pre_data': Count(pre_field),
        'wells_with_pst_data': Count(pst_field),
        'avg_pre': Avg(pre_field),
        'min_pre': Min(pre_field),
        'max_pre': Max(pre_field),
        'avg_pst': Avg(pst_field),
        'min_pst': Min(pst_field),
        'max_pst': Max(pst_field)
    }
    
    for y in years:
        agg_map[f'lt_pre_{y}'] = Avg(f'pre_{y}')
        agg_map[f'lt_pst_{y}'] = Avg(f'pst_{y}')
        
    results = queryset.aggregate(**agg_map)
    
    valid_vals = [results[f'lt_pre_{y}'] for y in years if results[f'lt_pre_{y}'] is not None] + \
                 [results[f'lt_pst_{y}'] for y in years if results[f'lt_pst_{y}'] is not None]
    avg_longterm = sum(valid_vals) / len(valid_vals) if valid_vals else None
    
    aquifer_dist = queryset.values('aquifer').annotate(
        count=Count('id')
    ).order_by('-count')
    
    return {
        'summary': {
            'year': year,
            'total_wells': results['total_wells'],
            'wells_with_pre_data': results['wells_with_pre_data'],
            'wells_with_pst_data': results['wells_with_pst_data'],
            'avg_pre_monsoon': results['avg_pre'],
            'avg_pst_monsoon': results['avg_pst'],
            'avg_longterm': round(avg_longterm, 2) if avg_longterm is not None else None,
            'min_pre_monsoon': results['min_pre'],
            'max_pre_monsoon': results['max_pre'],
            'min_pst_monsoon': results['min_pst'],
            'max_pst_monsoon': results['max_pst']
        },
        'aquifer_distribution': list(aquifer_dist),
    }

def calculate_aquifer_yearly_trends(queryset):
    """
    Get aggregated groundwater level trends for all years.
    """
    years = range(2015, 2025)
    agg_map = {}
    for year in years:
        agg_map[f'pre_{year}'] = Avg(f'pre_{year}')
        agg_map[f'pst_{year}'] = Avg(f'pst_{year}')
        
    results = queryset.aggregate(**agg_map)
    
    yearly_data = []
    for year in years:
        pre_val = results[f'pre_{year}']
        pst_val = results[f'pst_{year}']
        
        avg_val = None
        if pre_val is not None and pst_val is not None:
            avg_val = round((pre_val + pst_val) / 2, 2)
        elif pre_val is not None:
            avg_val = round(pre_val, 2)
        elif pst_val is not None:
            avg_val = round(pst_val, 2)
            
        yearly_data.append({
            'year': str(year),
            'pre_monsoon': round(pre_val, 2) if pre_val is not None else None,
            'post_monsoon': round(pst_val, 2) if pst_val is not None else None,
            'average': avg_val
        })
    return yearly_data
