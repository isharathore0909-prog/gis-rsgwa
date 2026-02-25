from rest_framework import serializers
from .models import SpatialLayer

class SpatialLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpatialLayer
        fields = ['id', 'name', 'layer_type', 'properties', 'geometry']
