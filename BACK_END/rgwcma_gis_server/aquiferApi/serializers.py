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

    # Dynamic Average Fields
    avg_2015 = serializers.SerializerMethodField()
    avg_2016 = serializers.SerializerMethodField()
    avg_2017 = serializers.SerializerMethodField()
    avg_2018 = serializers.SerializerMethodField()
    avg_2019 = serializers.SerializerMethodField()
    avg_2020 = serializers.SerializerMethodField()
    avg_2021 = serializers.SerializerMethodField()
    avg_2022 = serializers.SerializerMethodField()
    avg_2023 = serializers.SerializerMethodField()
    avg_2024 = serializers.SerializerMethodField()

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
            # Averages (Calculated in Backend)
            'avg_2015', 'avg_2016', 'avg_2017', 'avg_2018', 'avg_2019',
            'avg_2020', 'avg_2021', 'avg_2022', 'avg_2023', 'avg_2024',
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

    def _get_avg(self, obj, year):
        pre = getattr(obj, f'pre_{year}', None)
        pst = getattr(obj, f'pst_{year}', None)
        if pre is not None and pst is not None:
            return round((pre + pst) / 2, 2)
        return pre if pre is not None else pst

    def get_avg_2015(self, obj): return self._get_avg(obj, 2015)
    def get_avg_2016(self, obj): return self._get_avg(obj, 2016)
    def get_avg_2017(self, obj): return self._get_avg(obj, 2017)
    def get_avg_2018(self, obj): return self._get_avg(obj, 2018)
    def get_avg_2019(self, obj): return self._get_avg(obj, 2019)
    def get_avg_2020(self, obj): return self._get_avg(obj, 2020)
    def get_avg_2021(self, obj): return self._get_avg(obj, 2021)
    def get_avg_2022(self, obj): return self._get_avg(obj, 2022)
    def get_avg_2023(self, obj): return self._get_avg(obj, 2023)
    def get_avg_2024(self, obj): return self._get_avg(obj, 2024)


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
    """Serializer for year-specific data queries with location context"""
    well_id = serializers.CharField()
    village_name = serializers.CharField()
    district = serializers.CharField()
    block = serializers.CharField()
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)
    aquifer = serializers.CharField(allow_null=True)
    year = serializers.IntegerField()
    pre_monsoon = serializers.FloatField(allow_null=True)
    post_monsoon = serializers.FloatField(allow_null=True)
    seasonal_change = serializers.FloatField(allow_null=True)
