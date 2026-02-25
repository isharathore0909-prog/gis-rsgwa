import sqlite3
import os
import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from aquiferApi.models import AquiferData
from locationApi.models import Village

class Command(BaseCommand):
    help = 'Migrate aquifer data from SQLite to Postgres'

    def handle(self, *args, **options):
        sqlite_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')
        if not os.path.exists(sqlite_path):
            self.stdout.write(self.style.ERROR(f"SQLite DB not found at {sqlite_path}"))
            return

        def normalize(name):
            if not name: return ""
            return "".join(e for e in str(name).lower() if e.isalnum())

        log_file = 'aquifer_migration_log.txt'
        with open(log_file, 'w') as f:
            f.write(f"Migration started at {datetime.datetime.now()}\n")
            
        def log(msg, style=None):
            if style:
                self.stdout.write(style(msg))
            else:
                self.stdout.write(msg)
            with open(log_file, 'a') as f:
                f.write(f"{msg}\n")

        try:
            conn = sqlite3.connect(sqlite_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # First, check if the table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='aquiferApi_aquiferdata'")
            if not cursor.fetchone():
                log("Table aquiferApi_aquiferdata not found in SQLite", self.style.ERROR)
                return

            # Get column names to be safe
            cursor.execute("PRAGMA table_info(aquiferApi_aquiferdata)")
            columns = [row['name'] for row in cursor.fetchall()]
            log(f"Columns in SQLite: {columns}")

            # Query with location data from SQLite too
            query = """
                SELECT 
                    aq.*,
                    v.name as v_name, g.name as g_name, b.name as b_name, d.name as d_name
                FROM aquiferApi_aquiferdata aq
                LEFT JOIN locationApi_village v ON aq.village_id = v.id
                LEFT JOIN locationApi_grampanchayat g ON v.grampanchayat_id = g.id
                LEFT JOIN locationApi_block b ON g.block_id = b.id
                LEFT JOIN locationApi_district d ON b.district_id = d.id
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            log(f"Found {len(rows)} records in SQLite.")

            # Cache Postgres Villages for matching
            log("Caching villages from Postgres...")
            all_villages = Village.objects.select_related('grampanchayat__block__district').all()
            
            strict_map = {}
            dist_v_map = {}
            v_norm_map = {}

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

            created_count = 0
            updated_count = 0
            missed_count = 0
            
            batch_size = 500
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]
                with transaction.atomic():
                    for row in batch:
                        try:
                            v_name = row['v_name']
                            d_name = row['d_name']
                            b_name = row['b_name']
                            g_name = row['g_name']
                            
                            if not v_name:
                                missed_count += 1
                                continue

                            v_low = v_name.lower().strip()
                            d_low = d_name.lower().strip() if d_name else ""
                            b_low = b_name.lower().strip() if b_name else ""
                            g_low = g_name.lower().strip() if g_name else ""
                            v_norm = normalize(v_name)

                            village_obj = None
                            # Matching logic
                            village_obj = strict_map.get((d_low, b_low, g_low, v_low))
                            if not village_obj:
                                village_obj = dist_v_map.get((d_low, v_norm))
                            if not village_obj:
                                candidates = v_norm_map.get(v_norm)
                                if candidates:
                                    if len(candidates) == 1:
                                        village_obj = candidates[0]
                                    else:
                                        for c in candidates:
                                            c_d = c.grampanchayat.block.district.name.lower()
                                            if d_low and (d_low in c_d or c_d in d_low):
                                                village_obj = c
                                                break
                                        if not village_obj:
                                            village_obj = candidates[0]

                            if not village_obj:
                                missed_count += 1
                                continue

                            # Prepare defaults
                            defaults = {
                                'village': village_obj,
                                'latitude': row['latitude'],
                                'longitude': row['longitude'],
                                'well_depth': row['well_depth'],
                                'aquifer': row['aquifer'],
                            }
                            
                            # Handle year columns
                            for year in range(2015, 2025):
                                pre_col = f'pre_{year}'
                                pst_col = f'pst_{year}'
                                if pre_col in row.keys():
                                    defaults[pre_col] = row[pre_col]
                                if pst_col in row.keys():
                                    defaults[pst_col] = row[pst_col]

                            obj, created = AquiferData.objects.update_or_create(
                                well_id=row['well_id'],
                                defaults=defaults
                            )
                            if created: created_count += 1
                            else: updated_count += 1
                        except Exception as e:
                            log(f"Error at row: {e}")
                            missed_count += 1

                log(f"Progress: {min(i+batch_size, len(rows))}/{len(rows)}")

            log(f"Finished! Created: {created_count}, Updated: {updated_count}, Missed: {missed_count}", self.style.SUCCESS)
            conn.close()

        except Exception as e:
            log(f"Error: {e}", self.style.ERROR)
            import traceback
            traceback.print_exc()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            import traceback
            traceback.print_exc()
