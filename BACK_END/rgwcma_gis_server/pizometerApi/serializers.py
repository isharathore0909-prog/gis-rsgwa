from rest_framework import serializers
from .models import Piezometer

class PiezometerSerializer(serializers.ModelSerializer):
    district_name = serializers.ReadOnlyField(source='village.grampanchayat.block.district.name')
    block_name = serializers.ReadOnlyField(source='village.grampanchayat.block.name')
    gp_name = serializers.ReadOnlyField(source='village.grampanchayat.name')
    village_name = serializers.ReadOnlyField(source='village.name')

    class Meta:
        model = Piezometer
        fields = [
            'id', 'village', 'village_name', 'gp_name', 'block_name', 'district_name',
            'piezometer_name', 'water_level_depth', 'date', 'latitude', 'longitude',
            'created_at', 'updated_at'
        ]
