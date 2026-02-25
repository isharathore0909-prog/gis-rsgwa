from django.contrib import admin
from .models import Rainfall, RainfallStation, StationRainfall

@admin.register(Rainfall)
class RainfallAdmin(admin.ModelAdmin):
    list_display = ('village', 'date', 'rainfall_mm', 'gauge_type')
    list_filter = ('gauge_type', 'date')
    search_fields = ('village__name',)

@admin.register(RainfallStation)
class RainfallStationAdmin(admin.ModelAdmin):
    list_display = ('name', 'latitude', 'longitude')
    search_fields = ('name',)

@admin.register(StationRainfall)
class StationRainfallAdmin(admin.ModelAdmin):
    list_display = ('station', 'date', 'rainfall_mm')
    list_filter = ('date', 'station')
    search_fields = ('station__name',)
