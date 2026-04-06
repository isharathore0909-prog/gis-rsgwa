import json
from django.core.management.base import BaseCommand
from layersApi.models import SpatialLayer

class Command(BaseCommand):
    help = 'Inspect properties of groundwater_zone layer in the database'

    def handle(self, *args, **options):
        queryset = SpatialLayer.objects.filter(layer_type='groundwater_zone')
        count = queryset.count()
        self.stdout.write(f"Total features for 'groundwater_zone': {count}")

        if count == 0:
            return

        # Sample properties from the first 5 records
        self.stdout.write("\nSample Properties (first 5 records):")
        for obj in queryset[:5]:
            self.stdout.write(f"ID: {obj.id}, Name: {obj.name}")
            self.stdout.write(f"Properties: {json.dumps(obj.properties, indent=2)}")
            self.stdout.write("-" * 20)

        # Check for unique property keys across all records
        all_keys = set()
        categories = set()
        block_statuses = set()
        
        for obj in queryset:
            all_keys.update(obj.properties.keys())
            cat = obj.properties.get('Category')
            status = obj.properties.get('block_status')
            if cat: categories.add(cat)
            if status: block_statuses.add(status)

        self.stdout.write(f"\nAll unique property keys: {sorted(list(all_keys))}")
        self.stdout.write(f"Unique 'Category' values: {sorted(list(categories))}")
        self.stdout.write(f"Unique 'block_status' values: {sorted(list(block_statuses))}")
