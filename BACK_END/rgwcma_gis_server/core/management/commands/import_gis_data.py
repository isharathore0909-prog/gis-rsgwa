import os
import json
import re
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from django.db import transaction
from locationApi.models import Country, State, District, Block, Grampanchayat, Village
from layersApi.models import SpatialLayer

def normalize(s):
    return re.sub(r'[^A-Z0-9]', '', str(s if s else '').upper())

def safe_geom(geom_data):
    if not geom_data: return None
    try:
        return GEOSGeometry(json.dumps(geom_data))
    except:
        return None

def stream_features(path):
    """Memory efficient GeoJSON feature streamer using regex."""
    with open(path, 'r', encoding='utf-8') as f:
        chunk_size = 1024 * 1024 * 10 # 10MB
        buffer = ""
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            buffer += chunk
            
            while True:
                start_match = re.search(r'\{\s*"type"\s*:\s*"Feature"', buffer)
                if not start_match:
                    buffer = buffer[-100:]
                    break
                
                start_pos = start_match.start()
                next_match = re.search(r'\{\s*"type"\s*:\s*"Feature"', buffer[start_pos + 10:])
                
                if next_match:
                    end_pos = start_pos + 10 + next_match.start()
                    feature_chunk = buffer[start_pos:end_pos].strip()
                    if feature_chunk.endswith(','): feature_chunk = feature_chunk[:-1]
                    
                    try:
                        yield json.loads(feature_chunk)
                    except:
                        pass
                    buffer = buffer[end_pos:]
                else:
                    break
        
        if buffer.strip():
            match = re.search(r'\{\s*"type"\s*:\s*"Feature".*', buffer, re.DOTALL)
            if match:
                s = match.group(0).strip()
                last_brace = s.rfind('}')
                if last_brace != -1:
                    try:
                        yield json.loads(s[:last_brace+1])
                    except: pass

class Command(BaseCommand):
    help = 'Imports GIS data (Districts, Blocks, GPs, Villages) from GeoJSON files.'

    def add_arguments(self, parser):
        parser.add_argument('--path', type=str, default=r"C:\Users\pc\Documents", help='Path to the directory containing GeoJSON files')

    def handle(self, *args, **options):
        base_path = options['path']
        
        country, _ = Country.objects.get_or_create(name="India")
        state, _ = State.objects.get_or_create(name="Rajasthan", country=country)

        self.stdout.write("Clearing existing data...")
        Village.objects.all().delete()
        Grampanchayat.objects.all().delete()
        Block.objects.all().delete()
        District.objects.all().delete()
        SpatialLayer.objects.all().delete()

        # 1. Districts
        self.stdout.write("Loading districts...")
        path = os.path.join(base_path, "districts_41_with_codes.geojson")
        if not os.path.exists(path):
            self.stdout.write(self.style.ERROR(f"File not found: {path}"))
            return
            
        with open(path, 'r', encoding='utf-8') as f: data = json.load(f)
        dist_map = {}
        for f in data['features']:
            props = f['properties']
            name = props.get('New_Dist') or props.get('name')
            geom = safe_geom(f.get('geometry'))
            if geom:
                d = District.objects.create(name=name, state=state, code=str(props.get('district_code')), geometry=geom)
                dist_map[normalize(name)] = d
        self.stdout.write(f"Done: {District.objects.count()} districts.")

        # 2. Blocks
        self.stdout.write("Loading blocks...")
        path = os.path.join(base_path, "BLOCK_301_41_DISTRICT_with_unique_block_codes.geojson")
        with open(path, 'r', encoding='utf-8') as f: data = json.load(f)
        block_map = {}
        for f in data['features']:
            props = f['properties']
            dist = dist_map.get(normalize(props.get('DISTRICT_N')))
            geom = safe_geom(f.get('geometry'))
            if dist and geom:
                b = Block.objects.create(name=props.get('BLOCK_NAME'), district=dist, code=str(props.get('BLOCK_CODE')), geometry=geom)
                block_map[normalize(b.name)] = b
        self.stdout.write(f"Done: {Block.objects.count()} blocks.")

        # 3. GPs
        self.stdout.write("Loading GPs...")
        path = os.path.join(base_path, "gp_301_with_corrected_code.geojson")
        with open(path, 'r', encoding='utf-8') as f: data = json.load(f)
        gp_objs = []
        seen_gp_names = set()
        for f in data['features']:
            props = f['properties']
            block = block_map.get(normalize(props.get('BLOCK_NAME_2')))
            geom = safe_geom(f.get('geometry'))
            if block and geom:
                name = props.get('GP_FINAL')
                code = str(props.get('GP_FINAL_C'))
                if (name, block.id) in seen_gp_names:
                    name = f"{name} ({code})"
                seen_gp_names.add((name, block.id))
                gp_objs.append(Grampanchayat(name=name, block=block, code=code, geometry=geom))
        Grampanchayat.objects.bulk_create(gp_objs)
        gp_map = {str(g.code): g for g in Grampanchayat.objects.all()}
        self.stdout.write(f"Done: {Grampanchayat.objects.count()} GPs.")

        # 4. Villages
        self.stdout.write("Loading villages...")
        path = os.path.join(base_path, "village_301_corrected_with code.geojson")
        vlg_objs = []
        seen_vlg_names = set()
        count = 0
        with open(path, 'r', encoding='utf-8') as f: data = json.load(f)
        for f in data['features']:
            props = f['properties']
            gp = gp_map.get(str(props.get('GP_FINAL_C')))
            geom = safe_geom(f.get('geometry'))
            if gp and geom:
                name = props.get('VILLAGE_NM')
                code = str(props.get('GVIL-ID'))
                if (name, gp.id) in seen_vlg_names:
                    name = f"{name} ({code})"
                seen_vlg_names.add((name, gp.id))
                vlg_objs.append(Village(name=name, grampanchayat=gp, code=code, geometry=geom))
                count += 1
                if len(vlg_objs) >= 2000:
                    Village.objects.bulk_create(vlg_objs)
                    vlg_objs = []
                    self.stdout.write(f"  Processed {count} villages...")
        if vlg_objs: Village.objects.bulk_create(vlg_objs)
        self.stdout.write(f"Done: {Village.objects.count()} villages.")

        # 5. Spatial Layers
        mapping = {
            "aquifer_with_correct_code.geojson": "aquifer",
            "canals_with_village.geojson": "canal",
            "waterbodies_with_village.geojson": "waterbody"
        }
        for fname, ltype in mapping.items():
            self.stdout.write(f"Loading {ltype}...")
            path = os.path.join(base_path, fname)
            SpatialLayer.objects.filter(layer_type=ltype).delete()
            
            if fname == "aquifer_with_correct_code.geojson":
                layer_objs = []
                count = 0
                for f in stream_features(path):
                    props = f['properties']
                    name = props.get('NAME') or props.get('Aquifer') or f"{ltype}_{count}"
                    geom = safe_geom(f.get('geometry'))
                    if geom:
                        layer_objs.append(SpatialLayer(name=name, layer_type=ltype, properties=props, geometry=geom))
                        count += 1
                        if len(layer_objs) >= 2000:
                            SpatialLayer.objects.bulk_create(layer_objs)
                            layer_objs = []
                            if count % 10000 == 0: self.stdout.write(f"  Processed {count} {ltype}...")
                if layer_objs: SpatialLayer.objects.bulk_create(layer_objs)
            else:
                with open(path, 'r', encoding='utf-8') as f: data = json.load(f)
                layer_objs = []
                for count, f in enumerate(data['features']):
                    props = f['properties']
                    name = props.get('NAME') or props.get('Type') or f"{ltype}_{count}"
                    geom = safe_geom(f.get('geometry'))
                    if geom:
                        layer_objs.append(SpatialLayer(name=name, layer_type=ltype, properties=props, geometry=geom))
                SpatialLayer.objects.bulk_create(layer_objs)
            self.stdout.write(f"Done: {SpatialLayer.objects.filter(layer_type=ltype).count()} {ltype} features.")
