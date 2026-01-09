import json
from rest_framework import serializers
from .models import Country, State, District, Block, Grampanchayat, Village, LocationCode

class BaseBoundarySerializer(serializers.ModelSerializer):
    geometry = serializers.SerializerMethodField()

    def get_geometry(self, obj):
        # Check if we have annotated geometry_geojson (from ST_AsGeoJSON)
        geojson_str = getattr(obj, 'geometry_geojson', None)
        if geojson_str:
            try:
                if isinstance(geojson_str, str):
                    return json.loads(geojson_str)
                return geojson_str
            except (json.JSONDecodeError, TypeError):
                pass
        
        return None


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = '__all__'

class StateSerializer(BaseBoundarySerializer):
    class Meta:
        model = State
        fields = ['id', 'name', 'code', 'geometry']

class DistrictSerializer(BaseBoundarySerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'code', 'geometry']

class BlockSerializer(BaseBoundarySerializer):
    class Meta:
        model = Block
        fields = ['id', 'name', 'code', 'geometry']

class GPSerializer(BaseBoundarySerializer):
    class Meta:
        model = Grampanchayat
        fields = ['id', 'name', 'code', 'geometry']

class VillageSerializer(BaseBoundarySerializer):
    class Meta:
        model = Village
        fields = ['id', 'name', 'code', 'geometry', 'latitude', 'longitude']

class LocationHierarchySerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationCode
        fields = ['dist_name', 'dist_code', 'block_name', 'block_code', 'gp_name', 'gp_code', 'vlg_name', 'vlg_code']
