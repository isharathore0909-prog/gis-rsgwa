from django.db.models import Avg, Sum, Count, Max, Min
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class LocationFilterMixin:
    """
    Mixin to provide standardized hierarchical location filtering.
    Supports both village-based and station-based models.
    """
    def filter_location(self, queryset):
        params = self.request.query_params
        model = queryset.model
        
        # Mapping of query parameters to model filter paths
        # ViewSets can override this by defining 'get_location_filters' or 'location_filters'
        if hasattr(self, 'get_location_filters'):
            location_filters = self.get_location_filters()
        elif hasattr(self, 'location_filters'):
            location_filters = self.location_filters
        else:
            # Default village-based hierarchy
            location_filters = {
                'state': 'village__grampanchayat__block__district__state__name__iexact',
                'district': 'village__grampanchayat__block__district__name__iexact',
                'block': 'village__grampanchayat__block__name__iexact',
                'grampanchayat': 'village__grampanchayat__name__iexact',
                'village_name': 'village__name__iexact',
                'village_id': 'village_id',
                
                # Station-specific filters (can be active if fields exist)
                'station_district': 'station__district__iexact',
                'station_id': 'station_id',
                'station_name': 'station__name__iexact',
            }
        
        for param, filter_path in location_filters.items():
            value = params.get(param)
            if value:
                # Basic validation: check if the relationship/field exists on the model
                parts = filter_path.split('__')
                if not parts:
                    continue
                    
                field_name = parts[0]
                try:
                    # Check if the model has this field or relation
                    model._meta.get_field(field_name)
                    # If it exists, apply the filter
                    queryset = queryset.filter(**{filter_path: value})
                except Exception:
                    # Field doesn't exist on this model, skip it silently
                    continue
        
        return queryset

    def spatial_nearby(self, queryset, lat, lon, radius_km=10):
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
            import math
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

class BaseAnalysisViewSet(viewsets.ReadOnlyModelViewSet, LocationFilterMixin):
    """
    Base ViewSet for GIS analysis data with standard filtering and aggregation patterns.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        return self.filter_location(queryset)

    def get_optimized_stats(self, queryset, fields_map):
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
