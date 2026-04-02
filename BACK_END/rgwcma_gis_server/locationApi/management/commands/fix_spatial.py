from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from locationApi.models import District, Block, Grampanchayat, Village

class Command(BaseCommand):
    help = 'Fixes spatial data coordinates that are flipped or using incorrect SRID.'

    def handle(self, *args, **options):
        self.fix_model(District)
        self.fix_model(Block)
        self.fix_model(Grampanchayat)
        self.fix_model(Village)

    def fix_model(self, model):
        self.stdout.write(f"Fixing {model.__name__}...")
        objs = model.objects.exclude(geometry=None)
        fixed_count = 0
        
        for obj in objs:
            try:
                cent = obj.geometry.centroid
                if abs(cent.x) > 180 or abs(cent.y) > 90:
                    geom_json = obj.geometry.geojson
                    geom = GEOSGeometry(geom_json)
                    if 2000000 < abs(cent.y) < 4000000:
                        geom.srid = 32643 if abs(cent.x) < 1000000 else 3857
                    else:
                        geom.srid = 3857
                    geom.transform(4326)
                    model.objects.filter(id=obj.id).update(geometry=geom)
                    fixed_count += 1
            except Exception as e:
                pass
                
        self.stdout.write(self.style.SUCCESS(f"  Fixed {fixed_count} records."))
