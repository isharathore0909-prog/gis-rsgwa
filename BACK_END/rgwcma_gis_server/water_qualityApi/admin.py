from django.contrib import admin
from .models import WaterQuality

@admin.register(WaterQuality)
class WaterQualityAdmin(admin.ModelAdmin):
    list_display = [
        'well_id', 
        'village_name', 
        # 'district', # Disabled due to missing hierarchy
        'meta_date', 
        'type_of_well',
        'ph', 
        'tds',
        'created_at'
    ]
    list_filter = [
        'type_of_well',
        'meta_date',
        # 'village__grampanchayat__block__district__name', # Removed
    ]
    search_fields = [
        'well_id',
        'village__village_name',
        # 'village__grampanchayat__block__district__name', # Removed
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Location Information', {
            'fields': ('village', 'latitude', 'longitude')
        }),
        ('Well Information', {
            'fields': ('well_id', 'type_of_well', 'well_depth', 'meta_date')
        }),
        ('Water Quality Parameters', {
            'fields': ('ph', 'hardness', 'alkalinity', 'nitrate', 'fluoride', 'ec', 'tds')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def village_name(self, obj):
        try:
            return obj.village.village_name
        except AttributeError:
            return "N/A"
    village_name.short_description = 'Village'
    
    # def district(self, obj):
    #     return obj.district
    # district.short_description = 'District'
