import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rgwcma_gis_server.settings')
django.setup()

from locationApi.models import Village

# List the cleaned villages in Tibi, Hanumangarh, Dhaulpur, Saipu, Sangariya
cleaned_village_ids = [
    205808, 205812, 205815, 205816, 205817, 205818, 205820, 205821, 205824, 205825, 205826, 205827, 205828, 205829, 205831,
    205511, 205512, 205513, 205517, 205521, 205522, 205528, 205539, 205540, 205544, 205547, 205549,
    205556, 205557, 205558, 205561, 205564, 205565, 205566, 205524, 205554,
    205494, 205495, 205497, 205502, 205510
]

qs = Village.objects.filter(id__in=cleaned_village_ids).select_related('grampanchayat', 'grampanchayat__block').order_by('grampanchayat__block__name', 'grampanchayat__name', 'name')

print(f"=== CLEANED VILLAGES AND THEIR CURRENT NAMES ({qs.count()} Villages) ===\n")

for v in qs:
    print(f"Block: {v.grampanchayat.block.name:15s} | GP: {v.grampanchayat.name:25s} | Clean Village Name: '{v.name}' (ID: {v.id})")

