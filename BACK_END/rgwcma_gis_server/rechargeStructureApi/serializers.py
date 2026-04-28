from rest_framework import serializers
from .models import RechargeStructure

class RechargeStructureSerializer(serializers.ModelSerializer):
    structure_name = serializers.ReadOnlyField(source='village.name')
    district = serializers.ReadOnlyField(source='village.grampanchayat.block.district.name')
    block = serializers.ReadOnlyField(source='village.grampanchayat.block.name')
    grampanchayat = serializers.ReadOnlyField(source='village.grampanchayat.name')
    
    class Meta:
        model = RechargeStructure
        fields = ['id', 'structure_type', 'other_recharge_structures', 'storage_capacity', 
                  'latitude', 'longitude', 'status', 'created_at', 'updated_at',
                  'structure_name', 'district', 'block', 'grampanchayat']
