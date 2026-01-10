from rest_framework import serializers
from .models import RechargeStructure

class RechargeStructureSerializer(serializers.ModelSerializer):
    village_name = serializers.ReadOnlyField(source='village.name')
    
    class Meta:
        model = RechargeStructure
        fields = '__all__'
