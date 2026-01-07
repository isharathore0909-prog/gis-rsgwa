from rest_framework import serializers
from .models import RainGauge

class RainGaugeSerializer(serializers.ModelSerializer):
    village_name = serializers.ReadOnlyField(source='village.name')

    class Meta:
        model = RainGauge
        fields = [
            'id', 'village', 'village_name', 'gauge_type', 
            'rainfall_mm', 'date', 'latitude', 'longitude',
            'created_at', 'updated_at'
        ]
