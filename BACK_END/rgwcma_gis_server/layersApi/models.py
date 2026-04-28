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
    area_sqkm = models.FloatField(null=True, blank=True, db_index=True)
    aquifer_type = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Automatically calculate area in SqKm if geometry is provided
        if self.geometry:
            try:
                # Transform to UTM Zone 43N (EPSG:32643) for accurate area calculation in Rajasthan
                temp_geom = self.geometry.clone()
                temp_geom.transform(32643)
                self.area_sqkm = temp_geom.area / 1_000_000.0
            except Exception:
                # Fallback to property if transformation fails
                try:
                    self.area_sqkm = float(self.properties.get('Area') or self.properties.get('AREA') or 0)
                except:
                    self.area_sqkm = 0
        
        # Cache the aquifer type for faster styling/filtering
        if self.layer_type == 'aquifer':
            self.aquifer_type = self.properties.get('Aquifer') or self.properties.get('aquifer') or self.properties.get('AQUIFER') or self.name
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.layer_type} - {self.name or self.id}"

    class Meta:
        verbose_name = "Spatial Layer"
        verbose_name_plural = "Spatial Layers"
