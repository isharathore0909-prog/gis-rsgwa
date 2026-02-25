from django.contrib import admin
from .models import Piezometer

@admin.register(Piezometer)
class PiezometerAdmin(admin.ModelAdmin):
    list_display = ('piezometer_name', 'village', 'date', 'water_level_depth')
    list_filter = ('date', 'village__grampanchayat__block__district')
    search_fields = ('piezometer_name', 'village__name')
