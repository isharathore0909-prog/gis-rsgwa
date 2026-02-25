
import sqlite3
import os
import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from rechargeStructureApi.models import RechargeStructure
from locationApi.models import Village

class Command(BaseCommand):
    help = 'Migrate recharge structure data from SQLite database with resilient matching'

    def handle(self, *args, **options):
        sqlite_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')
        if not os.path.exists(sqlite_path):
            self.stdout.write(self.style.ERROR(f"SQLite DB not found at {sqlite_path}"))
            return

        def normalize(name):
            if not name: return ""
            return "".join(e for e in str(name).lower() if e.isalnum())

        try:
            conn = sqlite3.connect(sqlite_path)
            cursor = conn.cursor()
            query = """
                SELECT 
                    rs.structure_type, rs.other_recharge_structures, rs.storage_capacity,
                    rs.latitude, rs.longitude,
                    v.name as v_name, g.name as g_name, b.name as b_name, d.name as d_name
                FROM rechargeStructureApi_rechargestructure rs
                LEFT JOIN locationApi_village v ON rs.village_id = v.id
                LEFT JOIN locationApi_grampanchayat g ON v.grampanchayat_id = g.id
                LEFT JOIN locationApi_block b ON g.block_id = b.id
                LEFT JOIN locationApi_district d ON b.district_id = d.id
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            self.stdout.write(f"Found {len(rows)} records in SQLite.")

            # Cache Postgres Villages
            all_villages = Village.objects.select_related('grampanchayat__block__district').all()
            self.stdout.write(f"Caching {len(all_villages)} villages from Postgres...")
            
            strict_map = {} # (dist, block, gp, village)
            dist_v_map = {} # (dist, norm_v)
            v_norm_map = {} # (norm_v) -> list of villages

            for v in all_villages:
                d_name = v.grampanchayat.block.district.name.lower().strip()
                b_name = v.grampanchayat.block.name.lower().strip()
                g_name = v.grampanchayat.name.lower().strip()
                v_name = v.name.lower().strip()
                v_norm = normalize(v_name)

                strict_map[(d_name, b_name, g_name, v_name)] = v
                if (d_name, v_norm) not in dist_v_map:
                    dist_v_map[(d_name, v_norm)] = v
                if v_norm not in v_norm_map:
                    v_norm_map[v_norm] = []
                v_norm_map[v_norm].append(v)

            created = 0
            missed = 0
            duplicates = 0
            
            for row in rows:
                if len(row) < 9: continue
                (structure_type, other, capacity, lat, lon, v_name, g_name, b_name, d_name) = row[:9]
                
                if not v_name:
                    missed += 1
                    continue

                v_low = v_name.lower().strip()
                d_low = d_name.lower().strip() if d_name else ""
                b_low = b_name.lower().strip() if b_name else ""
                g_low = g_name.lower().strip() if g_name else ""
                v_norm = normalize(v_name)

                village_obj = None

                # 1. Strict
                village_obj = strict_map.get((d_low, b_low, g_low, v_low))

                # 2. District + Norm Village
                if not village_obj:
                    village_obj = dist_v_map.get((d_low, v_norm))

                # 3. Global Norm Village
                if not village_obj:
                    candidates = v_norm_map.get(v_norm)
                    if candidates:
                        village_obj = candidates[0]

                # 4. Prefix Match
                if not village_obj and len(v_norm) >= 5 and d_low:
                    prefix = v_norm[:5]
                    for (d, vn), obj in dist_v_map.items():
                        if d == d_low and vn.startswith(prefix):
                            village_obj = obj
                            break

                # 5. NEW: Spatial Match
                if not village_obj and lat and lon:
                    try:
                        from django.contrib.gis.geos import Point
                        pnt = Point(float(lon), float(lat), srid=4326)
                        qs = Village.objects.all()
                        if d_low:
                            qs = qs.filter(grampanchayat__block__district__name__icontains=d_low)
                        village_obj = qs.filter(geometry__contains=pnt).first()
                    except:
                        pass

                if not village_obj:
                    missed += 1
                    continue

                # Duplication Check
                if RechargeStructure.objects.filter(village=village_obj, structure_type=structure_type, storage_capacity=capacity).exists():
                    duplicates += 1
                    continue

                RechargeStructure.objects.create(
                    village=village_obj,
                    structure_type=structure_type,
                    other_recharge_structures=other,
                    storage_capacity=capacity,
                    latitude=lat,
                    longitude=lon
                )
                created += 1

                if (created + missed + duplicates) % 500 == 0:
                    self.stdout.write(f"Progress: {created + missed + duplicates}/{len(rows)}")

            self.stdout.write(self.style.SUCCESS(f"Finished. Created: {created}, Duplicates: {duplicates}, Missed: {missed}"))
            conn.close()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            import traceback
            traceback.print_exc()
