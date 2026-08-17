import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from locationApi.models import Village, Grampanchayat

print("=== CHECKING VILLAGE NAMES WITH SUFFIXES LIKE _38037 ===")

# Pattern matching _ followed by 4 or 5 digits, e.g. _38037
suffixed_villages = [v for v in Village.objects.filter(name__contains='_') if re.search(r'_\d{4,6}$', v.name)]
print(f"Total Villages with '_XXXXX' suffix: {len(suffixed_villages)}")

for v in suffixed_villages[:20]:
    clean_name = re.sub(r'_\d{4,6}$', '', v.name).strip()
    print(f"Village ID {v.id:6d} | Raw: '{v.name:32s}' -> Clean: '{clean_name:25s}' | GP: '{v.grampanchayat.name}' (Block: {v.grampanchayat.block.name})")

