import math
from rest_framework import serializers

from .models import Rainfall, RainfallStation, StationRainfall
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Sanitize rainfall_mm
        val = data.get('rainfall_mm')
        if val is None:
            data['rainfall_mm'] = 0.0
        else:
            try:
                fval = float(val)
                if math.isnan(fval) or math.isinf(fval):
                    data['rainfall_mm'] = 0.0
            except (ValueError, TypeError):
                data['rainfall_mm'] = 0.0
        return data


class RainfallStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RainfallStation
        fields = '__all__'

class StationRainfallSerializer(serializers.ModelSerializer):
    station_name = serializers.ReadOnlyField(source='station.name')
    station_district = serializers.ReadOnlyField(source='station.district')
    station_lat = serializers.ReadOnlyField(source='station.latitude')
    station_lon = serializers.ReadOnlyField(source='station.longitude')

    class Meta:
        model = StationRainfall
        fields = ['id', 'station', 'station_name', 'station_district', 'station_lat', 'station_lon', 'date', 'rainfall_mm']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Sanitize rainfall_mm
        val = data.get('rainfall_mm')
        if val is None:
            data['rainfall_mm'] = 0.0
        else:
            try:
                fval = float(val)
                if math.isnan(fval) or math.isinf(fval):
                    data['rainfall_mm'] = 0.0
            except (ValueError, TypeError):
                data['rainfall_mm'] = 0.0
        return data


