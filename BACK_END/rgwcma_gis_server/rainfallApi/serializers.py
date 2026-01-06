from rest_framework import serializers
from .models import Rainfall
from locationApi.serializers import VillageSerializer

class RainfallSerializer(serializers.ModelSerializer):
    village_name = serializers.ReadOnlyField(source='village.name')
    latitude = serializers.ReadOnlyField(source='village.latitude')
    longitude = serializers.ReadOnlyField(source='village.longitude')

    class Meta:
        model = Rainfall
        fields = ['id', 'village', 'village_name', 'latitude', 'longitude', 'gauge_type', 'rainfall_mm', 'date']
