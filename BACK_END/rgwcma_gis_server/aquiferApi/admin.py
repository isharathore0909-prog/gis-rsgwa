from django.contrib import admin
from .models import AquiferData

@admin.register(AquiferData)
class AquiferDataAdmin(admin.ModelAdmin):
    list_display = [
        'well_id',
        'village_name',
        # 'district', # Disabled due to missing hierarchy
        'aquifer',
        'well_depth',
        'latest_measurement',
        'created_at'
    ]
    list_filter = [
        'aquifer',
        # 'village__grampanchayat__block__district__name', # Removed: Relationships not available in unmanaged models
    ]
    search_fields = [
        'well_id',
        'village__village_name', # Corrected field name
        'aquifer',
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Location Information', {
            'fields': ('village', 'latitude', 'longitude')
        }),
        ('Well Information', {
            'fields': ('well_id', 'well_depth', 'aquifer')
        }),
        ('2015 Measurements', {
            'fields': ('pre_2015', 'pst_2015'),
            'classes': ('collapse',)
        }),
        ('2016 Measurements', {
            'fields': ('pre_2016', 'pst_2016'),
            'classes': ('collapse',)
        }),
        ('2017 Measurements', {
            'fields': ('pre_2017', 'pst_2017'),
            'classes': ('collapse',)
        }),
        ('2018 Measurements', {
            'fields': ('pre_2018', 'pst_2018'),
            'classes': ('collapse',)
        }),
        ('2019 Measurements', {
            'fields': ('pre_2019', 'pst_2019'),
            'classes': ('collapse',)
        }),
        ('2020 Measurements', {
            'fields': ('pre_2020', 'pst_2020'),
            'classes': ('collapse',)
        }),
        ('2021 Measurements', {
            'fields': ('pre_2021', 'pst_2021'),
            'classes': ('collapse',)
        }),
        ('2022 Measurements', {
            'fields': ('pre_2022', 'pst_2022'),
            'classes': ('collapse',)
        }),
        ('2023 Measurements', {
            'fields': ('pre_2023', 'pst_2023'),
            'classes': ('collapse',)
        }),
        ('2024 Measurements', {
            'fields': ('pre_2024', 'pst_2024'),
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
    
    def latest_measurement(self, obj):
        """Show the most recent measurement"""
        for year in range(2024, 2014, -1):
            pst_val = getattr(obj, f'pst_{year}', None)
            if pst_val is not None:
                return f"{year} Post: {pst_val}m"
            pre_val = getattr(obj, f'pre_{year}', None)
            if pre_val is not None:
                return f"{year} Pre: {pre_val}m"
        return "No data"
    latest_measurement.short_description = 'Latest'
