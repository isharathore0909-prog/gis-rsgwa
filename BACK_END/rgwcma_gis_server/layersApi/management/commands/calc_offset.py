
from django.core.management.base import BaseCommand
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Calculate exact offset from properties.X/Y'

    def handle(self, *args, **options):
        queryset = SpatialLayer.objects.filter(layer_type='groundwater_zone')
        
        sum_dx = 0
        sum_dy = 0
        count = 0
        
        for obj in queryset:
            try:
                # Actual Lon/Lat from properties
                true_x = float(obj.properties.get('X', 0))
                true_y = float(obj.properties.get('Y', 0))
                
                if true_x == 0 or true_y == 0: continue
                
                # Current Centroid (WGS84)
                centroid = obj.geometry.centroid
                
                sum_dx += (true_x - centroid.x)
                sum_dy += (true_y - centroid.y)
                count += 1
            except Exception:
                continue
        
        if count > 0:
            avg_dx = sum_dx / count
            avg_dy = sum_dy / count
            self.stdout.write(f"Average Offset (Lon, Lat): [{avg_dx}, {avg_dy}]")
            self.stdout.write(f"Based on {count} features")
        else:
            self.stdout.write("No valid features with X/Y properties found")
