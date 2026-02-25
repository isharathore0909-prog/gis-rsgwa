from rest_framework import serializers
from .models import WaterQualityAvailability
from locationApi.serializers import VillageSerializer

class WaterQualityAvailabilitySerializer(serializers.ModelSerializer):
    # Read-only fields for location hierarchy
    state = serializers.CharField(read_only=True)
    district = serializers.CharField(read_only=True)
    block = serializers.CharField(read_only=True)
    grampanchayat = serializers.CharField(read_only=True)
    village_name = serializers.CharField(read_only=True)
    
    # Optional nested village details
    village_details = VillageSerializer(source='village', read_only=True)

    class Meta:
        model = WaterQualityAvailability
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
            'pre_ph',
            'post_ph',
            'pre_hardness',
            'post_hardness',
            'pre_alkalinity',
            'post_alkalinity',
            'pre_fluoride',
            'post_fluoride',
            'pre_nitrate',
            'post_nitrate',
            'pre_ec',
            'post_ec',
            'pre_tds',
            'post_tds',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_well_depth(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Well depth must be positive")
        return value
