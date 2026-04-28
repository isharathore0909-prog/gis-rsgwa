from django.db import models
from locationApi.models import Village

class WaterQuality(models.Model):
    WELL_TYPE_CHOICES = [
        ('bore_well', 'Bore Well'),
        ('dug_well', 'Dug Well'),
        ('hand_pump', 'Hand Pump'),
        ('tube_well', 'Tube Well'),
        ('open_well', 'Open Well'),
        ('other', 'Other'),
    ]

    # Location Information (linked to Village which has hierarchy)
    village = models.ForeignKey(
        Village, 
        related_name='water_quality_records', 
        on_delete=models.CASCADE
    )
    
    # Geographic Coordinates
    latitude = models.FloatField(null=True, blank=True, db_index=True, help_text="Latitude of the well")
    longitude = models.FloatField(null=True, blank=True, db_index=True, help_text="Longitude of the well")
    
    # Well Information
    well_id = models.CharField(max_length=100, unique=True, help_text="Unique identifier for the well")
    type_of_well = models.CharField(max_length=50, choices=WELL_TYPE_CHOICES, default='bore_well')
    well_depth = models.FloatField(null=True, blank=True, help_text="Depth of well in meters")
    
    # Metadata
    meta_date = models.DateField(db_index=True, help_text="Date of water quality measurement")
    
    # Water Quality Parameters
    ph = models.FloatField(null=True, blank=True, help_text="pH level")
    hardness = models.FloatField(null=True, blank=True, help_text="Hardness in mg/L")
    alkalinity = models.FloatField(null=True, blank=True, help_text="Alkalinity in mg/L")
    nitrate = models.FloatField(null=True, blank=True, help_text="Nitrate in mg/L")
    fluoride = models.FloatField(null=True, blank=True, help_text="Fluoride in mg/L")
    ec = models.FloatField(null=True, blank=True, help_text="Electrical Conductivity in µS/cm")
    tds = models.FloatField(null=True, blank=True, help_text="Total Dissolved Solids in mg/L")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'water_qualityApi_waterquality'
        ordering = ['-meta_date']
        unique_together = ('well_id', 'meta_date')
        verbose_name = 'Water Quality Record'
        verbose_name_plural = 'Water Quality Records'

    def __str__(self):
        return f"{self.well_id} - {self.village.name} - {self.meta_date}"

    @property
    def state(self):
        """Get state from village hierarchy"""
        try:
            return self.village.grampanchayat.block.district.state.name
        except AttributeError:
            return "N/A"

    @property
    def district(self):
        """Get district from village hierarchy"""
        try:
            return self.village.grampanchayat.block.district.name
        except AttributeError:
            return "N/A"

    @property
    def block(self):
        """Get block from village hierarchy"""
        try:
            return self.village.grampanchayat.block.name
        except AttributeError:
            return "N/A"

    @property
    def grampanchayat(self):
        """Get grampanchayat from village hierarchy"""
        try:
            return self.village.grampanchayat.name
        except AttributeError:
            return "N/A"

    @property
    def village_name(self):
        """Get village name"""
        try:
            return self.village.name
        except AttributeError:
            return "N/A"

from django.contrib.gis.db import models as gis_models

class WaterQualityContour(gis_models.Model):
    """
    Stores precomputed contour polygons (isobands) for water quality parameters.
    This allows GeoServer to serve them directly from PostGIS, bypassing slow SLD transformations.
    """
    parameter = models.CharField(max_length=50, db_index=True, help_text="ec, tds, ph, nitrate, fluoride, etc.")
    meta_date = models.DateField(db_index=True, help_text="Measurement date/year")
    
    # Bucket info
    min_value = models.FloatField(help_text="Lower bound of the contour interval")
    max_value = models.FloatField(help_text="Upper bound of the contour interval")
    label = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=20, blank=True, help_text="Suggested HEX color for the contour polygon")
    
    # Spatial property
    geom = gis_models.MultiPolygonField(srid=4326)
    
    # Administrative scope (for fast CQL filtering)
    district_id = models.IntegerField(null=True, blank=True, db_index=True)
    block_id = models.IntegerField(null=True, blank=True, db_index=True)
    gp_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'water_quality_contours'
        verbose_name = 'Water Quality Contour'
        verbose_name_plural = 'Water Quality Contours'
        indexes = [
            models.Index(fields=['parameter', 'meta_date']),
        ]

    def __str__(self):
        return f"{self.parameter} ({self.min_value}-{self.max_value}) - {self.meta_date}"
