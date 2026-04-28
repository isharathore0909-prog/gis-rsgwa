from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Populates area_sqkm column using high-performance raw spatial SQL'

    def handle(self, *args, **options):
        self.stdout.write("Calculating spatial areas (this may take up to 60 seconds)...")
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE "layersApi_spatiallayer" 
                SET "area_sqkm" = ST_Area(ST_Transform("geometry", 32643)) / 1000000.0 
                WHERE "area_sqkm" IS NULL AND "geometry" IS NOT NULL;
            """)
            count = cursor.rowcount
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {count} rows."))
