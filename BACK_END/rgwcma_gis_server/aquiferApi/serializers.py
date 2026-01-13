from rest_framework import serializers
from .models import AquiferData
from locationApi.serializers import VillageSerializer

class AquiferDataSerializer(serializers.ModelSerializer):
    # Read-only fields for location hierarchy
    state = serializers.CharField(read_only=True)
    district = serializers.CharField(read_only=True)
    block = serializers.CharField(read_only=True)
    grampanchayat = serializers.CharField(read_only=True)
    village_name = serializers.CharField(read_only=True)
    
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = AquiferData
        fields = [
            'id',
            'well_id',
            'village',
            'state',
            'district',
            'block',
            'grampanchayat',
            'village_name',
            'latitude',
            'longitude',
            'well_depth',
            'aquifer',
            # 2015
            'pre_2015', 'pst_2015',
            # 2016
            'pre_2016', 'pst_2016',
            # 2017
            'pre_2017', 'pst_2017',
            # 2018
            'pre_2018', 'pst_2018',
            # 2019
            'pre_2019', 'pst_2019',
            # 2020
            'pre_2020', 'pst_2020',
            # 2021
            'pre_2021', 'pst_2021',
            # 2022
            'pre_2022', 'pst_2022',
            # 2023
            'pre_2023', 'pst_2023',
            # 2024
            'pre_2024', 'pst_2024',
            # Metadata
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


    def get_latitude(self, obj):
        if obj.latitude:
            return obj.latitude
        return obj.village.latitude if obj.village else None

    def get_longitude(self, obj):
        if obj.longitude:
            return obj.longitude
        return obj.village.longitude if obj.village else None


class AquiferDataListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    state = serializers.CharField(read_only=True)
    district = serializers.CharField(read_only=True)
    block = serializers.CharField(read_only=True)
    village_name = serializers.CharField(read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    
    # Latest measurements
    latest_pre = serializers.SerializerMethodField()
    latest_pst = serializers.SerializerMethodField()

    class Meta:
        model = AquiferData
        fields = [
            'id',
            'well_id',
            'state',
            'district',
            'block',
            'village_name',
            'latitude',
            'longitude',
            'aquifer',
            'latest_pre',
            'latest_pst',
        ]
    
    def get_latitude(self, obj):
        if obj.latitude:
            return obj.latitude
        return obj.village.latitude if obj.village else None

    def get_longitude(self, obj):
        if obj.longitude:
            return obj.longitude
        return obj.village.longitude if obj.village else None
    
    def get_latest_pre(self, obj):
        """Get the most recent pre-monsoon measurement"""
        for year in range(2024, 2014, -1):
            val = getattr(obj, f'pre_{year}', None)
            if val is not None:
                return {'year': year, 'value': val}
        return None
    
    def get_latest_pst(self, obj):
        """Get the most recent post-monsoon measurement"""
        for year in range(2024, 2014, -1):
            val = getattr(obj, f'pst_{year}', None)
            if val is not None:
                return {'year': year, 'value': val}
        return None


class YearDataSerializer(serializers.Serializer):
    """Serializer for year-specific data queries"""
    year = serializers.IntegerField()
    well_id = serializers.CharField()
    village_name = serializers.CharField()
    pre_monsoon = serializers.FloatField(allow_null=True)
    post_monsoon = serializers.FloatField(allow_null=True)
    seasonal_change = serializers.FloatField(allow_null=True)
