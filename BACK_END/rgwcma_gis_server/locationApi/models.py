from django.db import models
import uuid

class ApiKey(models.Model):
    name_of_org = models.CharField(max_length=100)
    contact_no = models.CharField(max_length=20)
    api_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name_of_org} - {self.api_key}"

class Country(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class State(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='states')
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'country')

    def __str__(self):
        return self.name

class District(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='districts')
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'state')

    def __str__(self):
        return self.name

class Block(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='blocks')
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'district')

    def __str__(self):
        return self.name

class Grampanchayat(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='gram_panchayats')
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'block')

    def __str__(self):
        return self.name

class Village(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    grampanchayat = models.ForeignKey(Grampanchayat, on_delete=models.CASCADE, related_name='villages')
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'grampanchayat')

    def __str__(self):
        return self.name

class LocationCode(models.Model):
    dist_name = models.CharField(max_length=255, db_index=True)
    dist_code = models.CharField(max_length=50, db_index=True)
    block_name = models.CharField(max_length=255, db_index=True)
    block_code = models.CharField(max_length=50, db_index=True)
    gp_name = models.CharField(max_length=255, db_index=True)
    gp_code = models.CharField(max_length=50)
    vlg_name = models.CharField(max_length=255)
    vlg_code = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return f"{self.vlg_name} ({self.vlg_code})"
