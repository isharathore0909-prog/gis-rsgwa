from rest_framework import serializers
from .models import Country, State, District, Block, Grampanchayat, Village

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = '__all__'

class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = '__all__'

class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = '__all__'

class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = '__all__'

class GrampanchayatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grampanchayat
        fields = '__all__'

class VillageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Village
        fields = '__all__'
