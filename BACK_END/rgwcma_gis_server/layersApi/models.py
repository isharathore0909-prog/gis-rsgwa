from django.contrib.gis.db import models

class SpatialLayer(models.Model):
    LAYER_TYPES = [
        ('aquifer', 'Aquifer'),
        ('canal', 'Canal'),
        ('groundwater_zone', 'Groundwater Zone'),
        ('waterbody', 'Waterbody'),
    ]
    
    name = models.CharField(max_length=255, null=True, blank=True)
    layer_type = models.CharField(max_length=50, choices=LAYER_TYPES, db_index=True)
    properties = models.JSONField(default=dict, help_text="Store extra GeoJSON properties")
    geometry = models.GeometryField(srid=4326)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.layer_type} - {self.name or self.id}"

    class Meta:
        verbose_name = "Spatial Layer"
        verbose_name_plural = "Spatial Layers"
