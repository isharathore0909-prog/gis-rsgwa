import numpy as np
from PIL import Image, ImageDraw
import io
import base64
import math

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return [int(hex_str[i:i+2], 16) for i in (0, 2, 4)]

def generate_contour_map(points, bounds, width=600, height=500, p=2.0, buckets=None, show_labels=False, boundary_geojson=None):
    """
    MIS_RSGWA Implementation of Contour Generation.
    Uses IDW (Inverse Distance Weighting) and PIL.
    """
    if not points:
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    # Ensure keys match (their version uses 'v', my view uses 'v' now too)
    pts_x = np.array([p['x'] for p in points])
    pts_y = np.array([p['y'] for p in points])
    pts_v = np.array([p['v'] for p in points])

    # OPTIMIZATION: Aggregate extremely dense points
    if len(pts_x) > 1000:
        import pandas as pd
        df = pd.DataFrame({'x': pts_x, 'y': pts_y, 'v': pts_v})
        # Group by 15-pixel chunks to dramatically reduce N
        df['x_bin'] = (df['x'] / 15).round() * 15
        df['y_bin'] = (df['y'] / 15).round() * 15
        agg = df.groupby(['x_bin', 'y_bin'], as_index=False)['v'].mean()
        pts_x = agg['x_bin'].values
        pts_y = agg['y_bin'].values
        pts_v = agg['v'].values

    x = np.linspace(0, width, width)
    y = np.linspace(0, height, height)
    X, Y = np.meshgrid(x, y)

    def idw_vectorized(x_pts, y_pts, v_pts, grid_x, grid_y, p_pow):
        gx = grid_x.ravel()
        gy = grid_y.ravel()
        chunk_size = 1000  # Avoid OOM by replacing 50000 with 1000
        result = np.zeros(gx.shape)
        for i in range(0, len(gx), chunk_size):
            cx = gx[i:i+chunk_size, np.newaxis]
            cy = gy[i:i+chunk_size, np.newaxis]
            d2 = (cx - x_pts)**2 + (cy - y_pts)**2
            d2[d2 < 1e-12] = 1e-12
            w = 1.0 / (d2**(p_pow/2.0))
            w_sum = np.sum(w, axis=1)
            result[i:i+chunk_size] = np.sum(w * v_pts, axis=1) / w_sum
        return result.reshape(grid_x.shape)

    grid = idw_vectorized(pts_x, pts_y, pts_v, X, Y, p)
    
    # Mapping logic from MIS_RSGWA
    if buckets and len(buckets) > 0:
        g_min = min(b['min'] for b in buckets)
        g_max = max(b['max'] for b in buckets)
    else:
        g_min = np.min(grid) if grid.size > 0 else 0
        g_max = np.max(grid) if grid.size > 0 else 10
    
    if g_min == g_max:
        g_max = g_min + 1
    
    amplify = 50
    amp_min = g_min
    amp_range = (g_max - g_min) * amplify
    c_step = max(amp_range / 40.0, 0.1) if amp_range > 0.01 else 0.1
 
    def get_line_idx(v):
        return np.floor(( (v - amp_min) * amplify ) / c_step)

    line_indices = get_line_idx(grid)
    lines_x = np.zeros_like(grid, dtype=bool)
    lines_y = np.zeros_like(grid, dtype=bool)
    lines_x[:, 1:] = line_indices[:, 1:] != line_indices[:, :-1]
    lines_y[1:, :] = line_indices[1:, :] != line_indices[:-1, :]
    is_line_grid = lines_x | lines_y

    data = np.zeros((height, width, 4), dtype=np.uint8)
    if buckets:
        for i in range(len(buckets)):
            b = buckets[i]
            # Convert hex color to rgb if necessary
            rgb = b.get('rgb') or hex_to_rgb(b.get('color', '#FFFFFF'))
            
            mask = (grid >= b['min']) & (grid < b['max'])
            if i == len(buckets) - 1:
                mask = mask | (grid >= b['max'])
            data[mask, 0] = rgb[0]
            data[mask, 1] = rgb[1]
            data[mask, 2] = rgb[2]
            data[mask, 3] = 180 # Transparency

    # Draw contour lines
    data[is_line_grid, 0:3] = 0
    data[is_line_grid, 3] = 100 # Line opacity

    if boundary_geojson:
        mask_img = Image.new('L', (width, height), 0)
        draw_mask = ImageDraw.Draw(mask_img)

        def pt2px(lon, lat):
            # Same mapping as project_pt
            px = ((lon - bounds['minX']) / (bounds['maxX'] - bounds['minX'])) * width
            py = height - ((lat - bounds['minY']) / (bounds['maxY'] - bounds['minY'])) * height
            return px, py

        features = boundary_geojson.get('features', [boundary_geojson]) if boundary_geojson.get('type') == 'FeatureCollection' else [boundary_geojson]
        has_polygons = False
        
        for f in features:
            geom = f.get('geometry', f)
            geom_type = geom.get('type', '')
            coords = geom.get('coordinates', [])
            
            polys = []
            if geom_type == 'Polygon':
                polys = [coords]
            elif geom_type == 'MultiPolygon':
                polys = coords
            
            for poly in polys:
                for i, ring in enumerate(poly):
                    ring_px = [pt2px(lon, lat) for lon, lat in ring]
                    if ring_px and len(ring_px) >= 3:
                        fill_color = 255 if i == 0 else 0
                        draw_mask.polygon(ring_px, fill=fill_color)
                        has_polygons = True
                        
        if has_polygons:
            mask_arr = np.array(mask_img)
            data[mask_arr == 0, 3] = 0

    img = Image.fromarray(data, 'RGBA')
    if show_labels:
        draw = ImageDraw.Draw(img)
        unique_lids = np.unique(line_indices)
        step = max(1, len(unique_lids) // 10)
        for lid in unique_lids[::step]:
            if lid < 0: continue
            mask = is_line_grid & (np.abs(line_indices - lid) < 0.5)
            coords = np.argwhere(mask)
            if len(coords) > 100:
                label_val = (lid * c_step / amplify) + amp_min
                label_text = f"{label_val:.1f}"
                for p_idx in [len(coords)//3, 2*len(coords)//3]:
                    y_px, x_px = coords[p_idx]
                    if 25 < x_px < width - 25 and 25 < y_px < height - 25:
                        draw.text((x_px-1, y_px-1), label_text, fill=(255,255,255,230))
                        draw.text((x_px+1, y_px+1), label_text, fill=(255,255,255,230))
                        draw.text((x_px, y_px), label_text, fill=(0,0,0,255))
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"

def get_parameter_analysis(parameter, values):
    """
    Returns threshold buckets and metadata for a given parameter.
    Adapted to produce buckets compatible with generate_contour_map.
    """
    p = parameter.lower()
    is_quality = p not in ['decadal_pre', 'decadal_pst'] and not p.startswith('pre_') and not p.startswith('pst_')
    unit = 'mg/L' if is_quality else 'm bgl'
    if p == 'ec': unit = 'µS/cm'
    elif p == 'ph': unit = 'pH'

    # Default thresholds
    buckets = []
    if 'ec' in p:
        buckets = [
            {'min': 0, 'max': 500, 'color': '#10b981', 'label': '< 500'},
            {'min': 500, 'max': 1000, 'color': '#34d399', 'label': '500-1000'},
            {'min': 1000, 'max': 1500, 'color': '#6ee7b7', 'label': '1000-1500'},
            {'min': 1500, 'max': 2000, 'color': '#a7f3d0', 'label': '1500-2000'},
            {'min': 2000, 'max': 2500, 'color': '#fef08a', 'label': '2000-2500'},
            {'min': 2500, 'max': 3000, 'color': '#fde047', 'label': '2500-3000'},
            {'min': 3000, 'max': 3500, 'color': '#facc15', 'label': '3000-3500'},
            {'min': 3500, 'max': 4000, 'color': '#fbbf24', 'label': '3500-4000'},
            {'min': 4000, 'max': 4500, 'color': '#f59e0b', 'label': '4000-4500'},
            {'min': 4500, 'max': 5000, 'color': '#f97316', 'label': '4500-5000'},
            {'min': 5000, 'max': 100000, 'color': '#ef4444', 'label': '> 5000'}
        ]
    elif 'nitrate' in p:
        buckets = [
            {'min': 0, 'max': 10, 'color': '#10b981', 'label': '< 10'},
            {'min': 10, 'max': 30, 'color': '#34d399', 'label': '10-30'},
            {'min': 30, 'max': 50, 'color': '#fde047', 'label': '30-50'},
            {'min': 50, 'max': 70, 'color': '#fbbf24', 'label': '50-70'},
            {'min': 70, 'max': 90, 'color': '#f97316', 'label': '70-90'},
            {'min': 90, 'max': 1000, 'color': '#ef4444', 'label': '> 90'}
        ]
    elif 'fluoride' in p:
        buckets = [
            {'min': 0, 'max': 0.5, 'color': '#10b981', 'label': '< 0.5'},
            {'min': 0.5, 'max': 1.0, 'color': '#34d399', 'label': '0.5-1.0'},
            {'min': 1.0, 'max': 1.5, 'color': '#fde047', 'label': '1.0-1.5'},
            {'min': 1.5, 'max': 2.0, 'color': '#facc15', 'label': '1.5-2.0'},
            {'min': 2.0, 'max': 2.5, 'color': '#fbbf24', 'label': '2.0-2.5'},
            {'min': 2.5, 'max': 3.0, 'color': '#f97316', 'label': '2.5-3.0'},
            {'min': 3.0, 'max': 100, 'color': '#ef4444', 'label': '> 3.0'}
        ]
    elif 'tds' in p:
        buckets = [
            {'min': 0, 'max': 500, 'color': '#10b981', 'label': '< 500'},
            {'min': 500, 'max': 1000, 'color': '#34d399', 'label': '500-1000'},
            {'min': 1000, 'max': 1500, 'color': '#fde047', 'label': '1000-1500'},
            {'min': 1500, 'max': 2000, 'color': '#facc15', 'label': '1500-2000'},
            {'min': 2000, 'max': 2500, 'color': '#fbbf24', 'label': '2000-2500'},
            {'min': 2500, 'max': 3000, 'color': '#f97316', 'label': '2500-3000'},
            {'min': 3000, 'max': 50000, 'color': '#ef4444', 'label': '> 3000'}
        ]
    else:
        buckets = [
            {'min': 0, 'max': 5, 'color': '#10b981', 'label': '0-5'},
            {'min': 5, 'max': 10, 'color': '#34d399', 'label': '5-10'},
            {'min': 10, 'max': 20, 'color': '#fde047', 'label': '10-20'},
            {'min': 20, 'max': 40, 'color': '#f97316', 'label': '20-40'},
            {'min': 40, 'max': 500, 'color': '#ef4444', 'label': '> 40'}
        ]
    
    return {
        'buckets': buckets,
        'unit': unit,
        'is_quality': is_quality,
        'parameter': parameter,
        'min': min(values) if values else 0,
        'max': max(values) if values else 10
    }

def utm_to_latlon(easting, northing):
    """Manual UTM to LatLon logic from MIS_RSGWA"""
    sa, sb = 6378137.0, 6356752.314245
    e2 = math.sqrt((sa**2) - (sb**2)) / sb
    e2sq, c = e2**2, sa**2 / sb
    x, y = easting - 500000, northing
    lon0 = (43 * 6 - 183) * math.pi / 180
    M = y / 0.9996
    phi = M / 6367449.1458
    e = (1 - sb / sa) / (1 + sb / sa)
    lat = phi + (3 * e / 2 - 27 * e**3 / 32) * math.sin(2 * phi) + (21 * e**2 / 16 - 55 * e**4 / 32) * math.sin(4 * phi) + (151 * e**3 / 96) * math.sin(6 * phi)
    N = c / math.sqrt(1 + e2sq * (math.cos(lat)**2))
    T, C = (math.tan(lat)**2), e2sq * (math.cos(lat)**2)
    R = c * (1 - e2sq) / ((1 + e2sq * (math.cos(lat)**2))**1.5)
    D = x / (N * 0.9996)
    latitude = lat - (N * math.tan(lat) / R) * (D**2 / 2 - (5 + 3 * T + 10 * C - 4 * C**2 - 9 * e2sq) * D**4 / 24 + (61 + 90 * T + 298 * C + 45 * T**2 - 252 * e2sq - 3 * C**2) * D**6 / 720)
    longitude = lon0 + (D - (1 + 2 * T + C) * D**3 / 6 + (5 - 2 * C + 28 * T - 3 * C**2 + 8 * e2sq + 24 * T**2) * D**5 / 120) / math.cos(lat)
    return [longitude * 180 / math.pi, latitude * 180 / math.pi]
