from rest_framework import serializers
from .models import Rainfall
from locationApi.serializers import VillageSerializer

class RainfallSerializer(serializers.ModelSerializer):
    # Optional: Include village details if needed, otherwise just ID is fine
    # village_details = VillageSerializer(source='village', read_only=True)

    class Meta:
        model = Rainfall
        fields = '__all__'
