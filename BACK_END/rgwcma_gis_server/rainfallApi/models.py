from django.db import models
from locationApi.models import Village

class Rainfall(models.Model):
    GAUGE_TYPE_CHOICES = [
        ('manual', 'Manual'),
        ('automatic', 'Automatic'),
        ('telemetric', 'Telemetric'),
    ]

    village = models.ForeignKey(Village, related_name='rainfall_records', on_delete=models.CASCADE)
    gauge_type = models.CharField(max_length=50, choices=GAUGE_TYPE_CHOICES, default='manual')
    rainfall_mm = models.FloatField(help_text="Rainfall in millimeters")
    date = models.DateField(db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('village', 'date', 'gauge_type')

    @property
    def village_name(self):
        return self.village.name

    @property
    def gram_panchayat_name(self):
        return self.village.grampanchayat.name

    @property
    def block_name(self):
        return self.village.grampanchayat.block.name

    @property
    def district_name(self):
        return self.village.grampanchayat.block.district.name

    def __str__(self):
        return f"{self.village.name} - {self.date} - {self.rainfall_mm}mm"

