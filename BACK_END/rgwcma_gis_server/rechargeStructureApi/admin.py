from django.contrib import admin
from .models import RechargeStructure

@admin.register(RechargeStructure)
class RechargeStructureAdmin(admin.ModelAdmin):
    list_display = ('structure_type', 'village', 'storage_capacity', 'latitude', 'longitude', 'created_at')
    list_filter = ('structure_type', 'village__grampanchayat__block__district')
    search_fields = ('structure_type', 'other_recharge_structures', 'village__name')
