import random
from django.core.management.base import BaseCommand
from water_qualityApi.models import WaterQuality
from waterquality_availabilityApi.models import WaterQualityAvailability

class Command(BaseCommand):
    help = 'Load dummy data into WaterQualityAvailability from WaterQuality table'

    def handle(self, *args, **options):
        # Clear existing data in WaterQualityAvailability
        WaterQualityAvailability.objects.all().delete()
        
        # Get unique wells from WaterQuality
        # Since WaterQuality has multiple records per well (different dates), 
        # we'll take the most recent one to get well info
        processed_wells = set()
        water_quality_records = WaterQuality.objects.all().order_by('-meta_date')
        
        created_count = 0
        for record in water_quality_records:
            if record.well_id in processed_wells:
                continue
            
            # Create dummy pre and post data
            # Using record's values as base for one of them
            pre_ph = round(record.ph or random.uniform(6.5, 8.5), 2)
            post_ph = round(pre_ph + random.uniform(-0.5, 0.5), 2)
            
            pre_tds = round(record.tds or random.uniform(200, 1500), 2)
            post_tds = round(pre_tds + random.uniform(-100, 100), 2)
            
            pre_hardness = round(record.hardness or random.uniform(100, 500), 2)
            post_hardness = round(pre_hardness + random.uniform(-50, 50), 2)
            
            pre_alkalinity = round(record.alkalinity or random.uniform(50, 300), 2)
            post_alkalinity = round(pre_alkalinity + random.uniform(-30, 30), 2)
            
            pre_nitrate = round(record.nitrate or random.uniform(0, 50), 2)
            post_nitrate = round(pre_nitrate + random.uniform(-5, 5), 2)
            
            pre_fluoride = round(record.fluoride or random.uniform(0.1, 1.5), 2)
            post_fluoride = round(pre_fluoride + random.uniform(-0.2, 0.2), 2)
            
            pre_ec = round(record.ec or random.uniform(300, 2500), 2)
            post_ec = round(pre_ec + random.uniform(-200, 200), 2)

            WaterQualityAvailability.objects.create(
                village=record.village,
                latitude=record.latitude,
                longitude=record.longitude,
                well_id=record.well_id,
                type_of_well=record.type_of_well,
                well_depth=record.well_depth,
                pre_ph=pre_ph,
                post_ph=post_ph,
                pre_hardness=pre_hardness,
                post_hardness=post_hardness,
                pre_alkalinity=pre_alkalinity,
                post_alkalinity=post_alkalinity,
                pre_fluoride=pre_fluoride,
                post_fluoride=post_fluoride,
                pre_nitrate=pre_nitrate,
                post_nitrate=post_nitrate,
                pre_ec=pre_ec,
                post_ec=post_ec,
                pre_tds=pre_tds,
                post_tds=post_tds
            )
            processed_wells.add(record.well_id)
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {created_count} dummy records into WaterQualityAvailability'))
