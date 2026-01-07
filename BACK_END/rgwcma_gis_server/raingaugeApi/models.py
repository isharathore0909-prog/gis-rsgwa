"""
Rain Gauge API Models

This module defines the RainGauge model for storing rain gauge station data
including location, rainfall measurements, and gauge type information.
"""

from django.db import models
from locationApi.models import Village


class RainGauge(models.Model):
    """
    Model representing a rain gauge station and its measurements.
    
    Stores information about rain gauge stations including their location,
    type, and rainfall measurements. Each record represents a single
    measurement from a specific gauge on a specific date.
    
    Attributes:
        village (ForeignKey): Reference to the village where gauge is located
        gauge_type (str): Type of rain gauge (manual/automatic/telemetric)
        rainfall_mm (float): Rainfall measurement in millimeters
        date (date): Date of the rainfall measurement
        latitude (float): Latitude coordinate of the gauge station
        longitude (float): Longitude coordinate of the gauge station
        created_at (datetime): Timestamp when record was created
        updated_at (datetime): Timestamp when record was last updated
    
    Meta:
        ordering: Records ordered by date (newest first)
        unique_together: Ensures one record per village/date/gauge_type combination
    """
    
    # =========================================================================
    # CHOICES
    # =========================================================================
    
    GAUGE_TYPES = [
        ('manual', 'Manual'),
        ('automatic', 'Automatic'),
        ('telemetric', 'Telemetric'),
    ]

    # =========================================================================
    # FIELDS
    # =========================================================================
    
    # Location Information
    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='rain_gauges',
        help_text='Village where the rain gauge is located'
    )
    latitude = models.FloatField(
        help_text='Latitude coordinate of the gauge station'
    )
    longitude = models.FloatField(
        help_text='Longitude coordinate of the gauge station'
    )
    
    # Gauge Information
    gauge_type = models.CharField(
        max_length=50,
        choices=GAUGE_TYPES,
        help_text='Type of rain gauge equipment'
    )
    
    # Measurement Data
    rainfall_mm = models.FloatField(
        help_text='Rainfall measurement in millimeters'
    )
    date = models.DateField(
        help_text='Date of the rainfall measurement'
    )
    
    # Metadata
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when the record was created'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when the record was last updated'
    )

    # =========================================================================
    # META CLASS
    # =========================================================================
    
    class Meta:
        ordering = ['-date']
        unique_together = ('village', 'date', 'gauge_type')
        verbose_name = 'Rain Gauge'
        verbose_name_plural = 'Rain Gauges'
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['village', 'date']),
        ]

    # =========================================================================
    # METHODS
    # =========================================================================
    
    def __str__(self):
        """Return string representation of the rain gauge record."""
        return f"{self.village.name} - {self.gauge_type} - {self.date}"
    
    def __repr__(self):
        """Return detailed representation for debugging."""
        return (
            f"<RainGauge: {self.village.name}, "
            f"{self.gauge_type}, {self.date}, "
            f"{self.rainfall_mm}mm>"
        )
