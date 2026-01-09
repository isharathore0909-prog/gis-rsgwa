from django.core.management.base import BaseCommand
from locationApi.models import ApiKey
import uuid


class Command(BaseCommand):
    help = 'Fix API key in database'

    def handle(self, *args, **options):
        target_key_str = "e32ebc1d-fe04-4bd7-9003-df5274c990e2"
        target_uuid = uuid.UUID(target_key_str)

        self.stdout.write("=" * 60)
        self.stdout.write("FIXING API KEY")
        self.stdout.write("=" * 60)

        # Delete all existing keys
        deleted_count = ApiKey.objects.all().delete()[0]
        self.stdout.write(f"Deleted {deleted_count} old keys")

        # Create new key
        new_key = ApiKey.objects.create(
            api_key=target_uuid,
            name_of_org="Frontend-App",
            contact_no="1234567890",
            is_active=True
        )

        self.stdout.write(self.style.SUCCESS(f"\n✓ Created new key:"))
        self.stdout.write(f"  Key: {new_key.api_key}")
        self.stdout.write(f"  Type: {type(new_key.api_key).__name__}")
        self.stdout.write(f"  Org: {new_key.name_of_org}")
        self.stdout.write(f"  Active: {new_key.is_active}")

        # Verify
        test_lookup = ApiKey.objects.filter(api_key=target_uuid, is_active=True)
        if test_lookup.exists():
            self.stdout.write(self.style.SUCCESS("\n✓ SUCCESS: Key can be found with UUID lookup"))
        else:
            self.stdout.write(self.style.ERROR("\n✗ FAILED: Key cannot be found"))

        self.stdout.write("=" * 60)
