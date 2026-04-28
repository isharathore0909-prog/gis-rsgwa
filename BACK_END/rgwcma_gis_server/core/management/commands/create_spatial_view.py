from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Creates or replaces the aquifer_spatial_view in the database.'

    def handle(self, *args, **options):
        query = """
        CREATE OR REPLACE VIEW aquifer_spatial_view AS
        SELECT 
            *, 
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geometry as geom 
        FROM "aquiferApi_aquiferdata"
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute(query)
            self.stdout.write(self.style.SUCCESS("Success! Created 'aquifer_spatial_view' in the database."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating view: {e}"))
