import math
from django.db.models import Sum, Avg, Count, Max, Min, Q, Case, When, Value, IntegerField
from django.db.models.functions import TruncMonth, TruncYear, ExtractMonth

def safe_round(val, precision=2):
    if val is None: return 0.0
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f): return 0.0
        return round(f, precision)
    except: return 0.0

def calculate_rainfall_stats(queryset, is_station_data=False, unit_count=None):
    """
    Standardized rainfall statistics calculation for both standard and station data.
    Optimized for large datasets (1M+ records) by merging all aggregations into a single pass.
    """
    monsoon_months = [6, 7, 8, 9]
    group_field = 'station_id' if is_station_data else 'village_id'

    # Single pass aggregation for all base and seasonal statistics
    stats = queryset.aggregate(
        total=Sum('rainfall_mm'),
        avg=Avg('rainfall_mm'),
        count=Count('id'),
        max=Max('rainfall_mm'),
        monsoon_total=Sum('rainfall_mm', filter=Q(date__month__in=monsoon_months)),
        non_monsoon_total=Sum('rainfall_mm', filter=~Q(date__month__in=monsoon_months)),
        monsoon_count=Count('id', filter=Q(date__month__in=monsoon_months)),
        non_monsoon_count=Count('id', filter=~Q(date__month__in=monsoon_months))
    )
    
    # Calculate averages from the merged stats
    total_val = stats['total'] or 0
    if unit_count is None:
        unit_count = queryset.values(group_field).distinct().count() or 1
    
    avg_total = total_val / unit_count
    
    monsoon_avg = (stats['monsoon_total'] or 0) / (stats['monsoon_count'] or 1)
    non_monsoon_avg = (stats['non_monsoon_total'] or 0) / (stats['non_monsoon_count'] or 1)

    # Max record details - optimized to only run if max_val exists
    max_val = stats.get('max')
    max_info = {'village': None, 'date': None}
    if max_val is not None:
        # This remains a separate query but is now indexed better if max_val is unique-ish
        max_record = queryset.filter(rainfall_mm=max_val).first()
        if max_record:
            if is_station_data:
                max_info['village'] = max_record.station.name if hasattr(max_record, 'station') else None
            else:
                max_info['village'] = max_record.village.name if hasattr(max_record, 'village') else None
            max_info['date'] = max_record.date

    return {
        'total': safe_round(stats['total']),
        'avg': safe_round(stats['avg']),
        'avg_station_total': safe_round(avg_total),
        'monsoon_avg': safe_round(monsoon_avg),
        'non_monsoon_avg': safe_round(non_monsoon_avg),
        'count': stats['count'],
        'max': safe_round(stats['max']),
        'maxVillage': max_info['village'],
        'maxDate': max_info['date'],
        'isStationData': is_station_data
    }

def calculate_rainfall_summary(queryset, timestep='daily', is_station_data=False):
    """
    Standardized rainfall summary for charts.
    """
    group_field = 'station' if is_station_data else 'village_id'
    count_label = 'station_count' if is_station_data else 'village_count'

    if timestep == 'monthly':
        data = queryset.annotate(month_trunc=TruncMonth('date')) \
                       .values('month_trunc') \
                       .annotate(
                           total=Sum('rainfall_mm'), 
                           unit_count=Count(group_field, distinct=True)
                       ) \
                       .order_by('month_trunc')
        return [
            {
                'name': d['month_trunc'].strftime('%Y-%m') if d['month_trunc'] else 'Unknown', 
                'total': safe_round(d['total']), 
                'average': safe_round(d['total'] / d['unit_count']) if d.get('unit_count', 0) > 0 else 0
            } for d in data
        ]
    
    elif timestep == 'yearly':
        data = queryset.annotate(year_trunc=TruncYear('date')) \
                       .values('year_trunc') \
                       .annotate(
                           total=Sum('rainfall_mm'), 
                           unit_count=Count(group_field, distinct=True)
                       ) \
                       .order_by('year_trunc')
        return [
            {
                'name': d['year_trunc'].strftime('%Y') if d['year_trunc'] else 'Unknown', 
                'total': safe_round(d['total']), 
                'average': safe_round(d['total'] / d['unit_count']) if d.get('unit_count', 0) > 0 else 0
            } for d in data
        ]

    elif timestep == 'seasonal':
        data = queryset.annotate(
            year_trunc=TruncYear('date'),
            month_num=ExtractMonth('date')
        ).annotate(
            is_monsoon=Case(
                When(month_num__in=[6, 7, 8, 9], then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).values('year_trunc', 'is_monsoon') \
         .annotate(
             total=Sum('rainfall_mm'),
             unit_count=Count(group_field, distinct=True)
         ).order_by('year_trunc', 'is_monsoon')
        
        years = {}
        for d in data:
            try:
                yr = d['year_trunc'].strftime('%Y') if hasattr(d['year_trunc'], 'strftime') else str(d['year_trunc'])[:4]
            except: yr = 'Unknown'

            if yr not in years:
                years[yr] = {'name': yr, 'monsoon': 0, 'non_monsoon': 0, 'total': 0, 'average': 0}
            
            avg = safe_round(d['total'] / d['unit_count']) if d.get('unit_count', 0) > 0 else 0
            if d['is_monsoon'] == 1: years[yr]['monsoon'] = avg
            else: years[yr]['non_monsoon'] = avg
            
            years[yr]['total'] += safe_round(d['total'])
            years[yr]['average'] += avg
        
        return list(years.values())
        
    else: # Daily
        data = queryset.values('date').annotate(total=Sum('rainfall_mm'), average=Avg('rainfall_mm')).order_by('date')
        return [{'name': str(d['date']), 'total': safe_round(d['total']), 'average': safe_round(d['average'])} for d in data]
