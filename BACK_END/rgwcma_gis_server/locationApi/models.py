from django.db import models

class Country(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class State(models.Model):
    name = models.CharField(max_length=255)
    country = models.ForeignKey(Country, related_name='states', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'country')

    def __str__(self):
        return f"{self.name}, {self.country.name}"

class District(models.Model):
    name = models.CharField(max_length=255)
    state = models.ForeignKey(State, related_name='districts', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'state')

    def __str__(self):
        return f"{self.name}, {self.state.name}"

class Block(models.Model):
    name = models.CharField(max_length=255)
    district = models.ForeignKey(District, related_name='blocks', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'district')

    def __str__(self):
        return f"{self.name}, {self.district.name}"

class Village(models.Model):
    name = models.CharField(max_length=255)
    block = models.ForeignKey(Block, related_name='villages', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'block')

    def __str__(self):
        return f"{self.name}, {self.block.name}"
