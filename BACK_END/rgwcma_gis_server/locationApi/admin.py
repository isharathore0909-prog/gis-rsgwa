from django.contrib import admin
from .models import ApiKey, Country, State, District, Block, Grampanchayat, Village, LocationCode

@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ('name_of_org', 'api_key', 'is_active', 'created_at')
    search_fields = ('name_of_org', 'api_key')
    list_filter = ('is_active', 'created_at')
    readonly_fields = ('api_key', 'created_at')

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('name', 'country', 'code')
    search_fields = ('name', 'code')
    list_filter = ('country',)

@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('name', 'state', 'code')
    search_fields = ('name', 'code')
    list_filter = ('state',)

@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('name', 'district', 'code')
    search_fields = ('name', 'code')
    list_filter = ('district',)

@admin.register(Grampanchayat)
class GrampanchayatAdmin(admin.ModelAdmin):
    list_display = ('name', 'block', 'code')
    search_fields = ('name', 'code')
    list_filter = ('block',)

@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ('name', 'grampanchayat', 'code', 'latitude', 'longitude')
    search_fields = ('name', 'code')
    list_filter = ('grampanchayat',)

@admin.register(LocationCode)
class LocationCodeAdmin(admin.ModelAdmin):
    list_display = ('dist_name', 'block_name', 'gp_name', 'vlg_name', 'vlg_code')
    search_fields = ('vlg_name', 'vlg_code', 'gp_name', 'block_name', 'dist_name')
    list_filter = ('dist_name',)
