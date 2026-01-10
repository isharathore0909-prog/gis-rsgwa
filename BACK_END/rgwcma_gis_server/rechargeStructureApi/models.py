from django.db import models
from locationApi.models import Village

class RechargeStructure(models.Model):
    structure_type = models.CharField(max_length=255, null=True, blank=True)
    other_recharge_structures = models.CharField(max_length=255, null=True, blank=True)
    storage_capacity = models.FloatField(null=True, blank=True)
    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name='recharge_structures')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.structure_type} - {self.village.name}"
