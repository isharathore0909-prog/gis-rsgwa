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
    import math
    monsoon_months = [6, 7, 8, 9]
    group_field = 'station_id' if is_station_data else 'village_id'

    # Filter out non-numeric and extreme values early for reliable aggregation
    queryset = queryset.filter(rainfall_mm__gte=0, rainfall_mm__lt=10000)

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
    # Normalize by years if the dataset spans multiple years to provide annualized figures
    year_count = queryset.annotate(year=TruncYear('date')).values('year').distinct().count() or 1
    
    total_val = stats['total'] or 0
    if unit_count is None:
        unit_count = queryset.values(group_field).distinct().count() or 1
    
    # Handle NaN/None cases for unit_count
    if not unit_count: unit_count = 1
        
    avg_total = (total_val / unit_count) / year_count
    
    monsoon_avg = (stats['monsoon_total'] or 0) / (stats['monsoon_count'] or 1)
    non_monsoon_avg = (stats['non_monsoon_total'] or 0) / (stats['non_monsoon_count'] or 1)

    # Max record details
    max_val = stats.get('max')
    max_info = {'village': None, 'date': None}
    if max_val is not None:
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
        'unit_count': unit_count,
        'max': safe_round(stats['max']),
        'maxVillage': max_info['village'],
        'maxDate': max_info['date'],
        'isStationData': is_station_data
    }

def calculate_rainfall_summary(queryset, timestep='daily', is_station_data=False):
    """
    Standardized rainfall summary for charts.
    """
    import math
    group_field = 'station' if is_station_data else 'village_id'
    
    # Filter out non-numeric values early
    queryset = queryset.filter(rainfall_mm__gte=0, rainfall_mm__lt=10000)

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


def calculate_rainfall_distribution(queryset, normal_avg=None, is_station_data=False):
    """
    Calculate IMD-style distribution (Excess, Normal, Deficient, Scanty) 
    categorized by location.
    
    If normal_avg is not provided, it uses the average of the queryset itself 
    to provide a relative distribution.
    """
    import math

    # Clean the queryset
    queryset = queryset.filter(rainfall_mm__gte=0, rainfall_mm__lt=10000)

    if is_station_data:
        station_data = queryset.values('station__name', 'station__district').annotate(
            avg_rainfall=Sum('rainfall_mm')
        ).order_by('station__district', 'station__name')
        loc_field = 'station__district'
    else:
        station_data = queryset.values('village__name', 'village__grampanchayat__block__district__name').annotate(
            avg_rainfall=Sum('rainfall_mm')
        ).order_by('village__grampanchayat__block__district__name', 'village__name')
        loc_field = 'village__grampanchayat__block__district__name'
    
    # If no baseline provided, use the average of this specific dataset
    # We use a list to avoid multiple DB evaluations
    data_list = list(station_data)
    
    # Calculate the number of unique years to provide annualized data
    year_count = queryset.annotate(year=TruncYear('date')).values('year').distinct().count() or 1

    if normal_avg is None or not (normal_avg > 0) or math.isnan(normal_avg):
        total_rainfall = 0
        count = 0
        for item in data_list:
            val = item.get('avg_rainfall')
            if val is not None and not math.isnan(val):
                # Annualize the location total
                total_rainfall += (val / year_count)
                count += 1
        normal_avg = (total_rainfall / count) if count > 0 else 600.0

    # Ensure normal_avg is a valid number
    if not normal_avg or math.isnan(normal_avg) or normal_avg <= 0:
        normal_avg = 1.0

    distribution_grouped = {}
    
    def categorize(avg, normal):
        if avg is None or (isinstance(avg, float) and math.isnan(avg)): return 'No Rain'
        if avg <= 0: return 'No Rain'
        if not normal: return 'Normal'
        
        # Absolute IMD thresholds relative to normal
        dev = ((float(avg) - float(normal)) / float(normal)) * 100
        if dev >= 20: return 'Excess'
        if dev >= -19: return 'Normal'
        if dev >= -59: return 'Deficient'
        if dev >= -99: return 'Scanty'
        return 'No Rain'

    overall_counts = {'Excess': 0, 'Normal': 0, 'Deficient': 0, 'Scanty': 0, 'No Rain': 0}
    total_locations = 0
    
    for item in data_list:
        location = item[loc_field] or 'Unknown'
        if location not in distribution_grouped:
            distribution_grouped[location] = {
                'location': location, 
                'Excess': 0, 'Normal': 0, 'Deficient': 0, 'Scanty': 0, 'No Rain': 0, 
                'total': 0
            }
        
        # Categorize using annualized value to ensure consistency with normal_avg
        annualized_avg = (item.get('avg_rainfall') or 0) / year_count
        status = categorize(annualized_avg, normal_avg)
        distribution_grouped[location][status] += 1
        distribution_grouped[location]['total'] += 1
        
        overall_counts[status] += 1
        total_locations += 1
        
    processed = []
    # Sort by location name for stable UI
    sorted_locs = sorted(distribution_grouped.keys())
    for loc in sorted_locs:
        group = distribution_grouped[loc]
        processed.append({
            'location': loc,
            'statusPercentages': {
                s: (group[s] / group['total'] * 100) for s in overall_counts.keys()
            }
        })
        
    overall_distribution = None
    if total_locations > 0:
        overall_distribution = {
            s: (overall_counts[s] / total_locations * 100) for s in overall_counts.keys()
        }
        overall_distribution['unit_count'] = total_locations
        overall_distribution['normal_used'] = round(normal_avg, 2)
        
    return {
        'processed': processed,
        'overall': overall_distribution
    }
