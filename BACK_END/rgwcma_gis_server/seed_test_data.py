import os
import django
import random
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from locationApi.models import District, Block, Grampanchayat, Village
from rainfallApi.models import Rainfall

def seed_rainfall_data():
    print("Seeding rainfall data...")
    
    # Coordinates mapping (approximate centers of some districts)
    coords = {
        'Ajmer': (26.4499, 74.6399),
        'Jaipur': (26.9124, 75.7873),
        'Jodhpur': (26.2389, 73.0243),
        'Udaipur': (24.5854, 73.7125),
        'Bikaner': (28.0222, 73.3119),
        'Sikar': (27.6094, 75.1397)
    }

    # Ensure we have at least these districts
    for dist_name, (lat, lng) in coords.items():
        dist = District.objects.filter(name__icontains=dist_name).first()
        if not dist:
            print(f"District {dist_name} not found, skipping...")
            continue
            
        block = dist.blocks.first()
        if not block:
            print(f"No block for {dist_name}, creating one...")
            block = Block.objects.create(name=f"{dist_name} Block", district=dist)
        
        gp = block.grampanchayats.first()
        if not gp:
            gp = Grampanchayat.objects.create(name=f"{dist_name} GP", block=block)
            
        village = gp.villages.first()
        if not village:
            village = Village.objects.create(name=f"{dist_name} Village", grampanchayat=gp)
        
        # Update village coordinates
        # Offset slightly to spread them out if multiple
        village.latitude = lat + random.uniform(-0.1, 0.1)
        village.longitude = lng + random.uniform(-0.1, 0.1)
        village.save()
        
        # Create rainfall records for the last 30 days
        today = date.today()
        for i in range(30):
            d = today - timedelta(days=i)
            amount = random.uniform(0, 50)
            if amount < 10: amount = 0 # Simulate dry days
            
            Rainfall.objects.update_or_create(
                village=village,
                date=d,
                gauge_type='manual',
                defaults={'rainfall_mm': round(amount, 2)}
            )
            
    print("Done seeding!")

if __name__ == "__main__":
    seed_rainfall_data()
