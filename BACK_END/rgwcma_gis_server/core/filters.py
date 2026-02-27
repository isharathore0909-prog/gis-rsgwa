from django_filters import rest_framework as filters
from django.db.models import Q
from rest_framework import filters as drf_filters

class HierarchicalLocationFilterBackend(drf_filters.BaseFilterBackend):
    """
    Unified Filter Backend for Hierarchical Location filtering.
    Supports state, district, block, grampanchayat, village_name, and station filters.
    """
    def filter_queryset(self, request, queryset, view):
        params = request.query_params
        model = queryset.model
        
        # Get filters from view or use default
        location_filters = getattr(view, 'location_filters', {
            'state': 'village__grampanchayat__block__district__state__name__iexact',
            'district': 'village__grampanchayat__block__district__name__iexact',
            'block': 'village__grampanchayat__block__name__iexact',
            'grampanchayat': 'village__grampanchayat__name__iexact',
            'gram_panchayat': 'village__grampanchayat__name__iexact',
            'village_name': 'village__name__iexact',
            'village': 'village__name__iexact',
            'village_id': 'village_id',
            'station_district': 'station__district__iexact',
            'station_id': 'station_id',
            'station_name': 'station__name__iexact',
        })

        for param, filter_path in location_filters.items():
            value = params.get(param)
            if value:
                # Handle comma-separated list for __in
                if filter_path.endswith('__in'):
                    value = [v.strip() for v in value.split(',') if v.strip()]
                    if not value:
                        continue
                
                # Validate the first part of the filter path exists on the model
                parts = filter_path.split('__')
                field_name = parts[0]
                try:
                    model._meta.get_field(field_name)
                    queryset = queryset.filter(**{filter_path: value})
                except Exception:
                    # Field doesn't exist on this model, try to handle it gracefully
                    continue
        
        return queryset

class RangeFilterSet(filters.FilterSet):
    """
    Base FilterSet for numeric range filtering (min/max).
    """
    @classmethod
    def create_range_filters(cls, model, fields):
        attrs = {'Meta': type('Meta', (), {'model': model, 'fields': []})}
        for field in fields:
            attrs[f'{field}_min'] = filters.NumberFilter(field_name=field, lookup_expr='gte')
            attrs[f'{field}_max'] = filters.NumberFilter(field_name=field, lookup_expr='lte')
        return type(f'{model.__name__}RangeFilter', (cls,), attrs)
