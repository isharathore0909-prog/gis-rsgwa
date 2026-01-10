from rest_framework import serializers
from .models import Rainfall
from locationApi.serializers import VillageSerializer

class RainfallSerializer(serializers.ModelSerializer):
    village_name = serializers.ReadOnlyField()
    gram_panchayat_name = serializers.ReadOnlyField()
    block_name = serializers.ReadOnlyField()
    district_name = serializers.ReadOnlyField()

    class Meta:
        model = Rainfall
        fields = [
            'id', 'village', 'village_name', 'gram_panchayat_name', 
            'block_name', 'district_name', 'gauge_type', 
            'rainfall_mm', 'date', 'latitude', 'longitude',
            'created_at', 'updated_at'
        ]

