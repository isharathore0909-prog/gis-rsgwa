"""Populate missing administrative boundary geometries from the GIS source files.

Unlike ``import_gis_data``, this command never deletes location records.  It
matches existing records by their stable codes (and districts by name) and only
fills geometry values that are currently missing, unless ``--replace`` is
explicitly provided.
"""

import json
import os

from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand, CommandError

from locationApi.models import District, Block, Grampanchayat, Village


DATASETS = (
    ('district', 'districts_41_with_codes.geojson', District, 'New_Dist', None, 3857),
    ('block', 'BLOCK_301_41_DISTRICT_with_unique_block_codes.geojson', Block, 'BLOCK_CODE', 'code', 4326),
    ('gp', 'gp_301_with_corrected_code.geojson', Grampanchayat, 'GP_FINAL_C', 'code', 4326),
    ('village', 'village_301_corrected_with code.geojson', Village, 'GVIL-ID', 'code', 32643),
)


def normalise_name(value):
    return ' '.join(str(value or '').upper().split())


def to_wgs84(geometry_data, source_srid):
    if not geometry_data:
        return None
    geometry = GEOSGeometry(json.dumps(geometry_data))
    geometry.srid = source_srid
    if source_srid != 4326:
        geometry.transform(4326)
    return geometry


class Command(BaseCommand):
    help = 'Populate missing district, block, GP, and village geometries from GeoJSON source files.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            default=r'D:\FSTP\layers',
            help='Directory containing the four supplied GeoJSON files.',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Replace existing geometries too; default updates only null geometry fields.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report matching records without writing changes.',
        )

    def handle(self, *args, **options):
        base_path = options['path']
        replace = options['replace']
        dry_run = options['dry_run']

        for level, filename, model, source_key, database_key, source_srid in DATASETS:
            path = os.path.join(base_path, filename)
            if not os.path.isfile(path):
                raise CommandError(f'Missing {level} source: {path}')

            self.stdout.write(f'Reading {level}: {path}')
            with open(path, 'r', encoding='utf-8') as source_file:
                features = json.load(source_file).get('features', [])

            if database_key:
                candidates = model.objects.all() if replace else model.objects.filter(geometry__isnull=True)
                lookup = {str(item.code): item for item in candidates if item.code is not None}
            else:
                candidates = model.objects.all() if replace else model.objects.filter(geometry__isnull=True)
                lookup = {normalise_name(item.name): item for item in candidates}

            updated = unmatched = invalid = 0
            for feature in features:
                properties = feature.get('properties') or {}
                source_value = properties.get(source_key)
                key = str(source_value) if database_key else normalise_name(source_value)
                record = lookup.get(key)
                if not record:
                    unmatched += 1
                    continue

                try:
                    geometry = to_wgs84(feature.get('geometry'), source_srid)
                except Exception:
                    invalid += 1
                    continue
                if not geometry:
                    invalid += 1
                    continue

                updated += 1
                if not dry_run:
                    model.objects.filter(pk=record.pk).update(geometry=geometry)

            action = 'would update' if dry_run else 'updated'
            self.stdout.write(self.style.SUCCESS(
                f'{level}: {action} {updated}; source records without a matching target: {unmatched}; invalid geometry: {invalid}.'
            ))
