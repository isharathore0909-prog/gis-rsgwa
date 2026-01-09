from django.core.management.base import BaseCommand
from locationApi.models import Country, State, District, Block, Grampanchayat, Village, LocationCode

class Command(BaseCommand):
    help = 'Populates hierarchical models (District, Block, GP, Village) from LocationCode'

    def handle(self, *args, **options):
        # Ensure State Rajasthan exists
        country, _ = Country.objects.get_or_create(name='India')
        state, _ = State.objects.get_or_create(name='Rajasthan', country=country)

        self.stdout.write(f"Syncing hierarchy for state: {state.name}")

        # Get unique districts from LocationCode
        districts_data = LocationCode.objects.values('dist_name', 'dist_code').distinct()
        for d_data in districts_data:
            if not d_data['dist_name']: continue
            district, d_created = District.objects.get_or_create(
                name=d_data['dist_name'].strip(),
                state=state,
                defaults={'code': d_data['dist_code']}
            )
            if d_created:
                self.stdout.write(f"Created District: {district.name}")

            # Blocks for this district
            blocks_data = LocationCode.objects.filter(dist_name=d_data['dist_name']).values('block_name', 'block_code').distinct()
            for b_data in blocks_data:
                if not b_data['block_name']: continue
                block, b_created = Block.objects.get_or_create(
                    name=b_data['block_name'].strip(),
                    district=district,
                    defaults={'code': b_data['block_code']}
                )
                if b_created:
                    self.stdout.write(f"  Created Block: {block.name}")

                # GPs for this block
                gps_data = LocationCode.objects.filter(block_name=b_data['block_name']).values('gp_name', 'gp_code').distinct()
                for g_data in gps_data:
                    if not g_data['gp_name']: continue
                    gp, g_created = Grampanchayat.objects.get_or_create(
                        name=g_data['gp_name'].strip(),
                        block=block,
                        defaults={'code': g_data['gp_code']}
                    )
                    # Note: We don't print GP for brevity

                    # Villages for this GP
                    villages_data = LocationCode.objects.filter(gp_name=g_data['gp_name'], block_name=b_data['block_name']).values('vlg_name', 'vlg_code').distinct()
                    for v_data in villages_data:
                        if not v_data['vlg_name']: continue
                        Village.objects.get_or_create(
                            name=v_data['vlg_name'].strip(),
                            grampanchayat=gp,
                            defaults={'code': v_data['vlg_code']}
                        )
        
        self.stdout.write(self.style.SUCCESS("Hierarchy sync completed!"))
