import json
from rest_framework import serializers
from .models import SpatialLayer

class SpatialLayerSerializer(serializers.ModelSerializer):
    geometry = serializers.SerializerMethodField()

    class Meta:
        model = SpatialLayer
        fields = ['id', 'name', 'layer_type', 'properties', 'geometry']

    def get_geometry(self, obj):
        if obj.geometry:
            return json.loads(obj.geometry.geojson)
        return None
