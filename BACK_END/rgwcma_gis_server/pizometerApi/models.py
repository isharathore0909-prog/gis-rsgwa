from django.db import models
from locationApi.models import Village

class Piezometer(models.Model):
    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name='piezometers')
    piezometer_name = models.CharField(max_length=255, null=True, blank=True)
    water_level_depth = models.FloatField(help_text="Depth to water level in meters", null=True, blank=True)
    date = models.DateField(db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('village', 'date', 'piezometer_name')

    def __str__(self):
        return f"{self.piezometer_name or self.village.name} - {self.date}"
