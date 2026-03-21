import math
import base64
import io
import json
import numpy as np
import geopandas as gpd
from PIL import Image
from django.db.models import Avg, Q, F
from django.contrib.gis.geos import Polygon as GEOSPolygon
from shapely.geometry import box
from shapely.wkb import loads as load_wkb

from .geometry_utils import normalize_name, normalize_to_3857, meters_to_latlon
from .styles import BLUE_PALETTE

def get_rainfall_stats(filters=None):
    """Fetch rainfall metrics at multiple hierarchical levels."""
    from rainfallApi.models import Rainfall, StationRainfall
    
    stats = {
        'district': {}, 'block': {}, 'gp': {}, 'village': {}
    }
    
    try:
        raw_query = Rainfall.objects.filter(rainfall_mm__lt=5000)
        station_query = StationRainfall.objects.filter(rainfall_mm__lt=5000)
        
        if filters:
            if filters.get('district') and filters.get('district').lower() != 'rajasthan':
                raw_query = raw_query.filter(village__grampanchayat__block__district__name__iexact=filters['district'])
                station_query = station_query.filter(station__district__iexact=filters['district'])
            if filters.get('block'):
                raw_query = raw_query.filter(village__grampanchayat__block__name__iexact=filters['block'])
            if filters.get('dataRangeStart'):
                raw_query = raw_query.filter(date__gte=filters['dataRangeStart'])
                station_query = station_query.filter(date__gte=filters['dataRangeStart'])
            if filters.get('dataRangeEnd'):
                raw_query = raw_query.filter(date__lte=filters['dataRangeEnd'])
                station_query = station_query.filter(date__lte=filters['dataRangeEnd'])

        # Aggregations
        d_records = raw_query.values('village__grampanchayat__block__district__name').annotate(avg=Avg('rainfall_mm'))
        for r in d_records:
            name = r.get('village__grampanchayat__block__district__name')
            if name: stats['district'][normalize_name(name)] = float(r['avg'] or 0.0)
        
        s_d_records = station_query.values('station__district').annotate(avg=Avg('rainfall_mm'))
        for r in s_d_records:
            name = r.get('station__district')
            if name: stats['district'][normalize_name(name)] = float(r['avg'] or 0.0)

        b_records = raw_query.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name').annotate(avg=Avg('rainfall_mm'))
        for r in b_records:
            d, b = r.get('village__grampanchayat__block__district__name'), r.get('village__grampanchayat__block__name')
            if d and b: stats['block'][(normalize_name(d), normalize_name(b))] = float(r['avg'] or 0.0)

        gp_records = raw_query.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name', 'village__grampanchayat__name').annotate(avg=Avg('rainfall_mm'))
        for r in gp_records:
            d, b, gp = r.get('village__grampanchayat__block__district__name'), r.get('village__grampanchayat__block__name'), r.get('village__grampanchayat__name')
            if d and b and gp: stats['gp'][(normalize_name(d), normalize_name(b), normalize_name(gp))] = float(r['avg'] or 0.0)

        v_records = raw_query.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name', 'village__grampanchayat__name', 'village__name').annotate(avg=Avg('rainfall_mm'))
        for r in v_records:
            d, b, gp, v = r.get('village__grampanchayat__block__district__name'), r.get('village__grampanchayat__block__name'), r.get('village__grampanchayat__name'), r.get('village__name')
            if d and b and gp and v: stats['village'][(normalize_name(d), normalize_name(b), normalize_name(gp), normalize_name(v))] = float(r['avg'] or 0.0)

        return stats
    except Exception as e:
        print(f"Hierarchical Rainfall Stats Error: {e}")
        return stats

def plot_thematic_rainfall(ax, clip_mask, filters=None):
    """Hierarchical thematic rainfall plotting."""
    stats = get_rainfall_stats(filters)
    f = filters or {}
    
    from locationApi.models import District, Block, Grampanchayat, Village
    gdf = None
    current_level = 'district'
    
    try:
        if f.get('village'):
            items = Village.objects.filter(name__iexact=f['village'], grampanchayat__name__iexact=f.get('gramPanchayat') or f.get('grampanchayat'))
            current_level = 'village'
        elif f.get('gramPanchayat') or f.get('grampanchayat'):
            gp_name = f.get('gramPanchayat') or f.get('grampanchayat')
            items = Village.objects.filter(grampanchayat__name__iexact=gp_name, grampanchayat__block__name__iexact=f.get('block'))
            current_level = 'village'
        elif f.get('block'):
            items = Grampanchayat.objects.filter(block__name__iexact=f['block'], block__district__name__iexact=f.get('district'))
            current_level = 'grampanchayat'
        elif f.get('district') and f.get('district').lower() != 'rajasthan':
            items = Block.objects.filter(district__name__iexact=f['district'])
            current_level = 'block'
        else:
            items = District.objects.all()
            current_level = 'district'

        items = items.exclude(geometry=None)
        if items.exists():
            rows = []
            for i in items:
                try:
                    geom_shapely = load_wkb(bytes(i.geometry.wkb))
                    if not geom_shapely.is_valid: geom_shapely = geom_shapely.buffer(0)
                    row = {'geometry': geom_shapely, 'name': i.name}
                    if current_level == 'district':
                        row['d_norm'] = normalize_name(i.name)
                    elif current_level == 'block':
                        row['d_norm'] = normalize_name(i.district.name)
                        row['b_norm'] = normalize_name(i.name)
                    elif current_level == 'grampanchayat':
                        row['d_norm'] = normalize_name(i.block.district.name)
                        row['b_norm'] = normalize_name(i.block.name)
                        row['gp_norm'] = normalize_name(i.name)
                    elif current_level == 'village':
                        row['d_norm'] = normalize_name(i.grampanchayat.block.district.name)
                        row['b_norm'] = normalize_name(i.grampanchayat.block.name)
                        row['gp_norm'] = normalize_name(i.grampanchayat.name)
                        row['v_norm'] = normalize_name(i.name)
                    rows.append(row)
                except: continue
            
            if rows:
                gdf = gpd.GeoDataFrame(rows)
                gdf = normalize_to_3857(gdf)
    except Exception as e:
        print(f"Thematic DB Fetch Error: {e}")

    if gdf is None or gdf.empty: return False
    
    if clip_mask is not None:
        try:
            if not clip_mask.is_valid: clip_mask = clip_mask.buffer(0)
            gdf = gpd.clip(gdf, clip_mask)
        except: pass
            
    def get_color(mm):
        if mm is None: return '#cbd5e1'
        if mm <= 0: return BLUE_PALETTE[0]
        if mm < 2.5: return BLUE_PALETTE[2]
        if mm < 7.6: return BLUE_PALETTE[4]
        if mm < 15: return BLUE_PALETTE[6]
        if mm < 35.6: return BLUE_PALETTE[8]
        if mm < 64.5: return BLUE_PALETTE[10]
        return BLUE_PALETTE[11]

    colors = []
    for _, row in gdf.iterrows():
        d, b, gp, v = row.get('d_norm'), row.get('b_norm'), row.get('gp_norm'), row.get('v_norm')
        val = None
        if v: val = stats['village'].get((d, b, gp, v))
        if val is None and gp: val = stats['gp'].get((d, b, gp))
        if val is None and b: val = stats['block'].get((d, b))
        if val is None and d: val = stats['district'].get(d)
        colors.append(get_color(float(val) if val is not None else 0.0))

    gdf.plot(ax=ax, color=colors, edgecolor='#1e293b', linewidth=0.2, zorder=1)
    return True

def plot_thematic_water_quality(ax, bounds_3857, clip_mask, filters=None):
    """Plotmatic water quality heatmap."""
    f = filters or {}
    param_keys = {'ec': 'showEC', 'tds': 'showTDS', 'nitrate': 'showNitrate', 'fluoride': 'showFluoride'}
    params = [p for p, key in param_keys.items() if f.get(key) or f.get(f'show{p.capitalize()}')]
    if not params: return False, '', []

    from water_qualityApi.models import WaterQuality
    from core.services.mapping import generate_contour_map, get_parameter_analysis, utm_to_latlon

    try:
        boundary_geojson = json.loads(gpd.GeoSeries([clip_mask], crs="EPSG:3857").to_crs("EPSG:4326").to_json())['features'][0]['geometry'] if clip_mask else None
        
        b_min_x, b_min_y, b_max_x, b_max_y = bounds_3857
        bounds_gdf = gpd.GeoDataFrame({'geometry': [box(b_min_x, b_min_y, b_max_x, b_max_y)]}, crs="EPSG:3857")
        min_lon, min_lat, max_lon, max_lat = bounds_gdf.to_crs("EPSG:4326").total_bounds

        padding = (max_lon - min_lon) * 0.2
        spatial_query = Q(latitude__range=(min_lat-padding, max_lat+padding), longitude__range=(min_lon-padding, max_lon+padding))

        dist, block, gp = f.get('district'), f.get('block'), f.get('grampanchayat') or f.get('gramPanchayat')
        loc_query = Q()
        if gp: loc_query = Q(village__grampanchayat__name__iexact=gp)
        elif block: loc_query = Q(village__grampanchayat__block__name__iexact=block)
        elif dist and dist.lower() != 'rajasthan': loc_query = Q(village__grampanchayat__block__district__name__iexact=dist)

        for p_name in params:
            raw_pts = WaterQuality.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(p_name))
            pts = []
            for p in raw_pts:
                lat, lon, val = p.get('latitude'), p.get('longitude'), p.get('val')
                if lat is None or lon is None or val is None: continue
                if lon > 200 or lat > 100: lon, lat = utm_to_latlon(lon, lat)
                pts.append({'lat': lat, 'lon': lon, 'val': val})

            if not pts: continue
            analysis = get_parameter_analysis(p_name, [p['val'] for p in pts])
            
            width, height = 1200, 1000
            dx, dy = (max_lon - min_lon or 0.01), (max_lat - min_lat or 0.01)
            proj_bounds = {'minX': min_lon - dx*0.05, 'maxX': max_lon + dx*0.05, 'minY': min_lat - dy*0.05, 'maxY': max_lat + dy*0.05}
            
            def project(lon, lat, pb):
                px = ((lon - pb['minX']) / (pb['maxX'] - pb['minX'])) * width
                py = height - ((lat - pb['minY']) / (pb['maxY'] - pb['minY'])) * height
                return px, py

            proj_pts = [{'x': p[0], 'y': p[1], 'v': pt['val']} for pt in pts for p in [project(pt['lon'], pt['lat'], proj_bounds)]]
            
            img_b3857 = gpd.GeoDataFrame({'geometry': [box(proj_bounds['minX'], proj_bounds['minY'], proj_bounds['maxX'], proj_bounds['maxY'])]}, crs="EPSG:4326").to_crs("EPSG:3857").total_bounds
            
            heatmap_b64 = generate_contour_map(proj_pts, proj_bounds, width, height, p=2.5, buckets=analysis['buckets'], show_labels=True, boundary_geojson=boundary_geojson)
            
            if heatmap_b64 and "," in heatmap_b64:
                img = Image.open(io.BytesIO(base64.b64decode(heatmap_b64.split(",")[1])))
                extent = [img_b3857[0], img_b3857[2], img_b3857[1], img_b3857[3]]
                ax.imshow(img, extent=extent, zorder=1.5, alpha=0.8)
                return True, p_name.upper(), analysis['buckets']
        return False, '', []
    except Exception as e:
        print(f"WQ Rendering Error: {e}")
        return False, '', []
