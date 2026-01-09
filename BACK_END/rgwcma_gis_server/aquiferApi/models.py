from django.db import models
from locationApi.models import Village

class AquiferData(models.Model):
    """
    Model to store groundwater level data for aquifer monitoring wells.
    Tracks pre-monsoon and post-monsoon measurements from 2015-2024.
    """
    
    # Location Information
    village = models.ForeignKey(
        Village, 
        related_name='aquifer_records', 
        on_delete=models.CASCADE,
        help_text="Village where the monitoring well is located"
    )
    
    # Well Information
    well_id = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Unique identifier for the monitoring well"
    )
    latitude = models.FloatField(
        null=True, 
        blank=True, 
        help_text="Latitude of the well"
    )
    longitude = models.FloatField(
        null=True, 
        blank=True, 
        help_text="Longitude of the well"
    )
    well_depth = models.FloatField(
        null=True, 
        blank=True, 
        help_text="Total depth of well in meters"
    )
    aquifer = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        help_text="Aquifer type/name"
    )
    
    # 2015 Measurements (in meters below ground level)
    pre_2015 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2015 depth to water level (m)")
    pst_2015 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2015 depth to water level (m)")
    
    # 2016 Measurements
    pre_2016 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2016 depth to water level (m)")
    pst_2016 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2016 depth to water level (m)")
    
    # 2017 Measurements
    pre_2017 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2017 depth to water level (m)")
    pst_2017 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2017 depth to water level (m)")
    
    # 2018 Measurements
    pre_2018 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2018 depth to water level (m)")
    pst_2018 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2018 depth to water level (m)")
    
    # 2019 Measurements
    pre_2019 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2019 depth to water level (m)")
    pst_2019 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2019 depth to water level (m)")
    
    # 2020 Measurements
    pre_2020 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2020 depth to water level (m)")
    pst_2020 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2020 depth to water level (m)")
    
    # 2021 Measurements
    pre_2021 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2021 depth to water level (m)")
    pst_2021 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2021 depth to water level (m)")
    
    # 2022 Measurements
    pre_2022 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2022 depth to water level (m)")
    pst_2022 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2022 depth to water level (m)")
    
    # 2023 Measurements
    pre_2023 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2023 depth to water level (m)")
    pst_2023 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2023 depth to water level (m)")
    
    # 2024 Measurements
    pre_2024 = models.FloatField(null=True, blank=True, help_text="Pre-monsoon 2024 depth to water level (m)")
    pst_2024 = models.FloatField(null=True, blank=True, help_text="Post-monsoon 2024 depth to water level (m)")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['well_id']
        verbose_name = 'Aquifer Data Record'
        verbose_name_plural = 'Aquifer Data Records'

    def __str__(self):
        return f"{self.well_id} - {self.village.name}"

    # Properties to access location hierarchy
    # Properties to access location hierarchy
    @property
    def state(self):
        """Get state from village hierarchy"""
        return None # Hierarchy unreliable without spatial join of unmanaged models
        # return self.village.grampanchayat.block.district.state.name

    @property
    def district(self):
        """Get district from village hierarchy"""
        return None # Hierarchy unreliable
        # return self.village.grampanchayat.block.district.name

    @property
    def block(self):
        """Get block from village hierarchy"""
        return None # Hierarchy unreliable
        # return self.village.grampanchayat.block.name

    @property
    def grampanchayat(self):
        """Get grampanchayat from village hierarchy"""
        return None # Hierarchy unreliable
        # return self.village.grampanchayat.name

    @property
    def village_name(self):
        """Get village name"""
        return self.village.village_name
    
    def get_year_data(self, year):
        """Get pre and post monsoon data for a specific year"""
        pre_field = f'pre_{year}'
        pst_field = f'pst_{year}'
        return {
            'year': year,
            'pre_monsoon': getattr(self, pre_field, None),
            'post_monsoon': getattr(self, pst_field, None),
            'seasonal_change': self.calculate_seasonal_change(year)
        }
    
    def calculate_seasonal_change(self, year):
        """Calculate seasonal change (post - pre) for a given year"""
        pre_val = getattr(self, f'pre_{year}', None)
        pst_val = getattr(self, f'pst_{year}', None)
        if pre_val is not None and pst_val is not None:
            return pst_val - pre_val
        return None
    
    def get_all_years_data(self):
        """Get data for all years"""
        years = range(2015, 2025)
        return [self.get_year_data(year) for year in years]
    
    def get_trend_data(self):
        """Get trend analysis data"""
        years = range(2015, 2025)
        pre_values = []
        pst_values = []
        
        for year in years:
            pre_val = getattr(self, f'pre_{year}', None)
            pst_val = getattr(self, f'pst_{year}', None)
            if pre_val is not None:
                pre_values.append({'year': year, 'value': pre_val})
            if pst_val is not None:
                pst_values.append({'year': year, 'value': pst_val})
        
        return {
            'pre_monsoon_trend': pre_values,
            'post_monsoon_trend': pst_values
        }
