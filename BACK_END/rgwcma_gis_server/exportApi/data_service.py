import os
import geopandas as gpd
from django.conf import settings
from django.core.cache import cache
from django.contrib.gis.geos import Polygon as GEOSPolygon
from shapely.wkt import loads as load_wkt
from shapely.wkb import loads as load_wkb
from .geometry_utils import normalize_to_3857

GEOJSON_PATH = os.path.join(settings.BASE_DIR, 'data')

LAYER_MAPPING = {
    'rivers': 'rivers.geojson', 
    'canals': 'canals_opt.json',          
    'waterbodies': 'waterbodies_opt.json',
    'groundwater_zones': 'groundwater_zone.json',
    'micro': 'micro.json',
    'aquifer': 'aquifer_opt.json',
    'rainfall': 'rainfall_data.json',
    'dams': 'dams.geojson',
    'state': 'Rajasthan.geojson',
    'district': 'Final_Dist_Boundary.geojson',
    'block': 'block_boundary_updated.json',
    'grampanchayat': 'gram_panchayat.geojson',
    'village': 'villages.geojson'
}

def get_cached_gdf(layer_name):
    """Load and cache GeoDataFrame to avoid repeated file I/O and projection."""
    cache_key = f"map_gdf_{layer_name}"
    gdf = cache.get(cache_key)
    if gdf is not None:
        return gdf
    
    filename = LAYER_MAPPING.get(layer_name)
    if not filename: return None
        
    file_path = os.path.join(GEOJSON_PATH, filename)
    if not os.path.exists(file_path): return None
        
    try:
        gdf = gpd.read_file(file_path)
        gdf = normalize_to_3857(gdf)
        cache.set(cache_key, gdf, 3600)
        return gdf
    except Exception as e:
        print(f"Error loading GDF {layer_name}: {e}")
        return None

def fetch_layer_data(layer, bbox, filters=None, clip_mask=None):
    """Fetch layer data from DB or File based on priority rules."""
    from layersApi.models import SpatialLayer
    from locationApi.models import District, Block, Grampanchayat, Village
    f = filters or {}
    gdf = None

    # 1. SpatialLayer DB
    try:
        query_box = GEOSPolygon.from_bbox(bbox)
        db_spatial = SpatialLayer.objects.filter(name__iexact=layer, geometry__intersects=query_box)
        if not db_spatial.exists():
            db_spatial = SpatialLayer.objects.filter(name__iexact=layer)
        if db_spatial.exists():
            gdf = gpd.GeoDataFrame([{'geometry': load_wkt(l.geometry.wkt), **l.properties} for l in db_spatial])
            gdf = normalize_to_3857(gdf)
    except Exception: pass

    # 2. Admin Models
    if (gdf is None or gdf.empty) and layer in ('district', 'block', 'grampanchayat', 'village'):
        model_cls = {'district': District, 'block': Block, 'grampanchayat': Grampanchayat, 'village': Village}[layer]
        items = model_cls.objects.exclude(geometry=None)
        
        # Hierarchical Filters
        dist_val = f.get('district', '')
        if dist_val and dist_val.lower() != 'rajasthan':
            if layer == 'district': items = items.filter(name__iexact=dist_val)
            elif layer == 'block': items = items.filter(district__name__iexact=dist_val)
            elif layer == 'grampanchayat': items = items.filter(block__district__name__iexact=dist_val)
            elif layer == 'village': items = items.filter(grampanchayat__block__district__name__iexact=dist_val)

        block_val = f.get('block', '')
        if block_val and layer in ('block', 'grampanchayat', 'village'):
            if layer == 'block': items = items.filter(name__iexact=block_val)
            elif layer == 'grampanchayat': items = items.filter(block__name__iexact=block_val)
            elif layer == 'village': items = items.filter(grampanchayat__block__name__iexact=block_val)

        gp_val = f.get('gramPanchayat') or f.get('grampanchayat', '')
        if gp_val and layer in ('grampanchayat', 'village'):
            if layer == 'grampanchayat': items = items.filter(name__iexact=gp_val)
            elif layer == 'village': items = items.filter(grampanchayat__name__iexact=gp_val)

        if f.get('village') and layer == 'village':
            items = items.filter(name__iexact=f['village'])

        if items.exists():
            rows = []
            for item in items:
                try:
                    g = load_wkb(bytes(item.geometry.wkb))
                    if not g.is_valid: g = g.buffer(0)
                    rows.append({'geometry': g, 'name': item.name})
                except: continue
            if rows:
                gdf = gpd.GeoDataFrame(rows)
                gdf = normalize_to_3857(gdf)

    # 3. File Fallback
    if (gdf is None or gdf.empty) and layer in LAYER_MAPPING:
        gdf = get_cached_gdf(layer)
    
    if gdf is not None and not gdf.empty and clip_mask:
        try: gdf = gpd.clip(gdf, clip_mask)
        except: pass
        
    return gdf
