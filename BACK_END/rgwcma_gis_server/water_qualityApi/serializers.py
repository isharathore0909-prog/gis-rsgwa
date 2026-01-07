from rest_framework import serializers
from .models import WaterQuality
from locationApi.serializers import VillageSerializer

class WaterQualitySerializer(serializers.ModelSerializer):
    # Read-only fields for location hierarchy
    state = serializers.CharField(read_only=True)
    district = serializers.CharField(read_only=True)
    block = serializers.CharField(read_only=True)
    grampanchayat = serializers.CharField(read_only=True)
    village_name = serializers.CharField(read_only=True)
    
    # Optional nested village details
    village_details = VillageSerializer(source='village', read_only=True)

    class Meta:
        model = WaterQuality
        fields = [
            'id',
            'well_id',
            'village',
            'village_details',
            'state',
            'district',
            'block',
            'grampanchayat',
            'village_name',
            'latitude',
            'longitude',
            'type_of_well',
            'well_depth',
            'meta_date',
            'ph',
            'hardness',
            'alkalinity',
            'nitrate',
            'fluoride',
            'ec',
            'tds',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_ph(self, value):
        """Validate pH is within reasonable range"""
        if value is not None and (value < 0 or value > 14):
            raise serializers.ValidationError("pH must be between 0 and 14")
        return value

    def validate_well_depth(self, value):
        """Validate well depth is positive"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Well depth must be positive")
        return value


class WaterQualityListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    state = serializers.CharField(read_only=True)
    district = serializers.CharField(read_only=True)
    block = serializers.CharField(read_only=True)
    grampanchayat = serializers.CharField(read_only=True)
    village_name = serializers.CharField(read_only=True)

    class Meta:
        model = WaterQuality
        fields = [
            'id',
            'well_id',
            'state',
            'district',
            'block',
            'grampanchayat',
            'village_name',
            'latitude',
            'longitude',
            'type_of_well',
            'meta_date',
            'ph',
            'tds',
        ]
