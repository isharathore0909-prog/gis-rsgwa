from django.db import models
from locationApi.models import Village

class WaterQualityAvailability(models.Model):
    WELL_TYPE_CHOICES = [
        ('bore_well', 'Bore Well'),
        ('dug_well', 'Dug Well'),
        ('hand_pump', 'Hand Pump'),
        ('tube_well', 'Tube Well'),
        ('open_well', 'Open Well'),
        ('other', 'Other'),
    ]

    # Location Information
    village = models.ForeignKey(
        Village, 
        related_name='water_quality_availability_records', 
        on_delete=models.CASCADE
    )
    
    # Geographic Coordinates
    latitude = models.FloatField(null=True, blank=True, help_text="Latitude of the well")
    longitude = models.FloatField(null=True, blank=True, help_text="Longitude of the well")
    
    # Well Information
    well_id = models.CharField(max_length=100, unique=True, help_text="Unique identifier for the well")
    type_of_well = models.CharField(max_length=50, choices=WELL_TYPE_CHOICES, default='bore_well')
    well_depth = models.FloatField(null=True, blank=True, help_text="Depth of well in meters")
    
    # Pre & Post water quality parameters
    pre_ph = models.FloatField(null=True, blank=True, help_text="pH level (Pre Monsson)")
    post_ph = models.FloatField(null=True, blank=True, help_text="pH level (Post Monsson)")
    
    pre_hardness = models.FloatField(null=True, blank=True, help_text="Hardness in mg/L (Pre Monsson)")
    post_hardness = models.FloatField(null=True, blank=True, help_text="Hardness in mg/L (Post Monsson)")
    
    pre_alkalinity = models.FloatField(null=True, blank=True, help_text="Alkalinity in mg/L (Pre Monsson)")
    post_alkalinity = models.FloatField(null=True, blank=True, help_text="Alkalinity in mg/L (Post Monsson)")
    
    pre_fluoride = models.FloatField(null=True, blank=True, help_text="Fluoride in mg/L (Pre Monsson)")
    post_fluoride = models.FloatField(null=True, blank=True, help_text="Fluoride in mg/L (Post Monsson)")
    
    pre_nitrate = models.FloatField(null=True, blank=True, help_text="Nitrate in mg/L (Pre Monsson)")
    post_nitrate = models.FloatField(null=True, blank=True, help_text="Nitrate in mg/L (Post Monsson)")
    
    pre_ec = models.FloatField(null=True, blank=True, help_text="Electrical Conductivity in µS/cm (Pre Monsson)")
    post_ec = models.FloatField(null=True, blank=True, help_text="Electrical Conductivity in µS/cm (Post Monsson)")
    
    pre_tds = models.FloatField(null=True, blank=True, help_text="Total Dissolved Solids in mg/L (Pre Monsson)")
    post_tds = models.FloatField(null=True, blank=True, help_text="Total Dissolved Solids in mg/L (Post Monsson)")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'waterquality_availability_table'
        verbose_name = 'Water Quality Availability'
        verbose_name_plural = 'Water Quality Availabilities'

    def __str__(self):
        return f"{self.well_id} - {self.village.name}"

    @property
    def state(self):
        try:
            return self.village.grampanchayat.block.district.state.name
        except AttributeError:
            return "N/A"

    @property
    def district(self):
        try:
            return self.village.grampanchayat.block.district.name
        except AttributeError:
            return "N/A"

    @property
    def block(self):
        try:
            return self.village.grampanchayat.block.name
        except AttributeError:
            return "N/A"

    @property
    def grampanchayat(self):
        try:
            return self.village.grampanchayat.name
        except AttributeError:
            return "N/A"

    @property
    def village_name(self):
        try:
            return self.village.name
        except AttributeError:
            return "N/A"
