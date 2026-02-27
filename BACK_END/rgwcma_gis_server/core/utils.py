from django.db.models import Avg, Sum, Count, Max, Min
import math

def spatial_nearby(queryset, lat, lon, radius_km=10):
    """
    Generic nearby search. Uses PostGIS if available and 'geometry' field exists, 
    otherwise falls back to Haversine approximation.
    """
    from django.conf import settings
    use_postgres = getattr(settings, 'USE_POSTGRES', False)
    model = queryset.model
    
    # Check if model has a geometry field
    has_geometry = False
    try:
        model._meta.get_field('geometry')
        has_geometry = True
    except Exception:
        has_geometry = False

    if use_postgres and has_geometry:
        from django.contrib.gis.geos import Point
        from django.contrib.gis.measure import D
        pnt = Point(lon, lat, srid=4326)
        return queryset.filter(geometry__dwithin=(pnt, radius_km * 1000))
    else:
        # Haversine approximation bounding box
        try:
            lat_val = float(lat)
            lon_val = float(lon)
        except (ValueError, TypeError):
            return queryset.none()

        lat_degree_km = 111.0
        lat_rad = math.radians(abs(lat_val))
        cos_lat = math.cos(lat_rad)
        lon_degree_km = 111.0 * cos_lat if cos_lat > 0.0001 else 1.0
        
        lat_delta = radius_km / lat_degree_km
        lon_delta = radius_km / lon_degree_km
        
        return queryset.filter(
            latitude__gte=lat_val - lat_delta,
            latitude__lte=lat_val + lat_delta,
            longitude__gte=lon_val - lon_delta,
            longitude__lte=lon_val + lon_delta
        )

def get_optimized_stats(queryset, fields_map):
    """
    Generic optimized statistical aggregation.
    fields_map: dict of {target_name: source_field}
    """
    aggregations = {}
    for name, field in fields_map.items():
        aggregations[f'avg_{name}'] = Avg(field)
        aggregations[f'max_{name}'] = Max(field)
        aggregations[f'min_{name}'] = Min(field)
        aggregations[f'sum_{name}'] = Sum(field)
    
    aggregations['count'] = Count('id')
    
    # Use .values() to force database-only aggregation without object instantiation
    return queryset.aggregate(**aggregations)
