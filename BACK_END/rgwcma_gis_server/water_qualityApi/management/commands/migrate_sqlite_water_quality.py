
import sqlite3
import os
import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from water_qualityApi.models import WaterQuality
from locationApi.models import Village, Grampanchayat, Block, District

class Command(BaseCommand):
    help = 'Migrate water quality data from SQLite database with resilient matching'

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
                    wq.well_id, wq.type_of_well, wq.well_depth, wq.meta_date,
                    wq.ph, wq.hardness, wq.alkalinity, wq.nitrate, wq.fluoride, wq.ec, wq.tds,
                    wq.latitude, wq.longitude,
                    v.name as v_name, g.name as g_name, b.name as b_name, d.name as d_name
                FROM water_qualityApi_waterquality wq
                LEFT JOIN locationApi_village v ON wq.village_id = v.id
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
            updated = 0
            missed = 0
            
            for row in rows:
                if len(row) < 17: continue
                well_id, type_of_well, well_depth, meta_date, ph, hardness, alkalinity, nitrate, fluoride, ec, tds, lat, lon, v_name, g_name, b_name, d_name = row[:17]
                
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

                # 3. Norm Village Name (Global)
                if not village_obj:
                    candidates = v_norm_map.get(v_norm)
                    if candidates:
                        if len(candidates) == 1:
                            village_obj = candidates[0]
                        else:
                            # Try to match district partially
                            for c in candidates:
                                c_d = c.grampanchayat.block.district.name.lower()
                                if d_low and (d_low in c_d or c_d in d_low):
                                    village_obj = c
                                    break
                            if not village_obj:
                                village_obj = candidates[0]

                # 4. Prefix Match (First 5 chars + District)
                if not village_obj and len(v_norm) >= 5 and d_low:
                    prefix = v_norm[:5]
                    for (d, vn), obj in dist_v_map.items():
                        if d == d_low and vn.startswith(prefix):
                            village_obj = obj
                            break

                # 5. NEW: Spatial Match (Point-in-Polygon)
                # If we have lat/lon and name matching failed, try finding the village spatially
                if not village_obj and lat and lon:
                    try:
                        from django.contrib.gis.geos import Point
                        pnt = Point(float(lon), float(lat), srid=4326)
                        # Find village that contains this point
                        # We restrict to the district if possible for speed
                        qs = Village.objects.all()
                        if d_low:
                            qs = qs.filter(grampanchayat__block__district__name__icontains=d_low)
                        
                        village_obj = qs.filter(geometry__contains=pnt).first()
                    except:
                        pass

                if not village_obj:
                    missed += 1
                    continue

                # Prepare Date
                if isinstance(meta_date, str):
                    try:
                        meta_date = datetime.datetime.strptime(meta_date, '%Y-%m-%d').date()
                    except ValueError:
                        try:
                            meta_date = datetime.datetime.strptime(meta_date, '%Y-%m-%d %H:%M:%S').date()
                        except:
                            meta_date = datetime.date.today()

                obj, created_now = WaterQuality.objects.update_or_create(
                    well_id=well_id,
                    meta_date=meta_date,
                    defaults={
                        'village': village_obj,
                        'type_of_well': type_of_well,
                        'well_depth': well_depth,
                        'ph': ph,
                        'hardness': hardness,
                        'alkalinity': alkalinity,
                        'nitrate': nitrate,
                        'fluoride': fluoride,
                        'ec': ec,
                        'tds': tds,
                        'latitude': lat,
                        'longitude': lon,
                    }
                )
                if created_now: created += 1
                else: updated += 1

                if (created + updated + missed) % 1000 == 0:
                    self.stdout.write(f"Progress: {created + updated + missed}/{len(rows)}")

            self.stdout.write(self.style.SUCCESS(f"Finished. Created: {created}, Updated: {updated}, Missed: {missed}"))
            conn.close()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            import traceback
            traceback.print_exc()
