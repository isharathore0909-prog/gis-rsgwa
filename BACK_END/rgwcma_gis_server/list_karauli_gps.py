import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from locationApi.models import District, Block

d = District.objects.get(name='KARAULI')
print(f"District: {d.name} (ID: {d.id})\n")

for b in Block.objects.filter(district=d).order_by('name'):
    gps = b.gram_panchayats.all().order_by('name')
    print(f"=== Block: '{b.name}' (ID: {b.id}, Code: {b.code}, Has Geometry: {b.geometry is not None}) - {gps.count()} Grampanchayats ===")
    for gp in gps:
        print(f"  - GP ID: {gp.id:5d} | Name: '{gp.name:32s}' | Code: {str(gp.code):6s} | Villages: {gp.villages.count()}")
    print()

