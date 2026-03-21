import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import math
import os

def _get_label_font(size=12):
    """Load a TrueType font for contour labels with fallback to PIL default."""
    candidate_paths = [
        # Linux / Docker
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        # Windows
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        # macOS
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size), True
            except Exception:
                continue
    # Ultimate fallback – tiny but always available
    return ImageFont.load_default(), False

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

    from scipy.ndimage import gaussian_filter
    grid_raw = idw_vectorized(pts_x, pts_y, pts_v, X, Y, p)
    # Smooth the grid to heavily reduce noise and small clustered artifact bubbles
    grid = gaussian_filter(grid_raw, sigma=6.0)
    
    # Improved contour interval calculation to ignore extreme outliers
    _tmin = np.percentile(grid, 2) if grid.size > 0 else 0
    _tmax = np.percentile(grid, 98) if grid.size > 0 else 10
    if _tmin == _tmax:
        _tmin, _tmax = np.min(grid), np.max(grid)
    if _tmin == _tmax:
        _tmax = _tmin + 1

    # Aiming for fewer intervals (wider separation) to reduce dense clusters
    rough_step = (_tmax - _tmin) / 5.0
    if rough_step <= 0: rough_step = 1.0
    magnitude = 10 ** np.floor(np.log10(rough_step)) if rough_step > 0 else 1
    rel_step = rough_step / magnitude
    if rel_step < 1.5: nice_step = 1 * magnitude
    elif rel_step < 3: nice_step = 2 * magnitude
    elif rel_step < 7: nice_step = 5 * magnitude
    else: nice_step = 10 * magnitude

    line_indices = np.floor(grid / nice_step)
    x_diff = line_indices[:, 1:] != line_indices[:, :-1]
    y_diff = line_indices[1:, :] != line_indices[:-1, :]

    levels_x = np.full_like(grid, np.nan)
    levels_x[:, 1:][x_diff] = np.maximum(line_indices[:, 1:][x_diff], line_indices[:, :-1][x_diff])
    
    levels_y = np.full_like(grid, np.nan)
    levels_y[1:, :][y_diff] = np.maximum(line_indices[1:, :][y_diff], line_indices[:-1, :][y_diff])
    
    contour_levels = np.fmax(levels_x, levels_y)
    is_line_grid = ~np.isnan(contour_levels)

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
            is_line_grid = is_line_grid & (mask_arr > 0)

    img = Image.fromarray(data, 'RGBA')
    if show_labels:
        draw = ImageDraw.Draw(img)
        font, is_truetype = _get_label_font(size=8)

        def _draw_label(x_px, y_px, text):
            """Draw a single label with white outline for contrast."""
            if not (20 < x_px < width - 20 and 20 < y_px < height - 20):
                return
            if is_truetype:
                for dx, dy in [(-1,-1),(-1,1),(1,-1),(1,1),(-1,0),(1,0),(0,-1),(0,1)]:
                    draw.text((x_px + dx, y_px + dy), text,
                              fill=(255, 255, 255, 220), font=font, anchor='mm')
                draw.text((x_px, y_px), text, fill=(0, 0, 0, 255), font=font, anchor='mm')
            else:
                try:
                    bbox = font.getbbox(text)
                    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
                except Exception:
                    tw, th = len(text) * 6, 10
                tx, ty = x_px - tw // 2, y_px - th // 2
                for dx, dy in [(-1,-1),(-1,1),(1,-1),(1,1),(-1,0),(1,0),(0,-1),(0,1)]:
                    draw.text((tx + dx, ty + dy), text, fill=(255, 255, 255, 220), font=font)
                draw.text((tx, ty), text, fill=(0, 0, 0, 255), font=font)

        from scipy.ndimage import label as segment_label
        unique_levels = np.unique(contour_levels[is_line_grid])

        # use 8-connectivity to trace distinct lines accurately
        structure = np.ones((3,3), dtype=int)

        for k in unique_levels:
            mask = is_line_grid & (contour_levels == k)
            labeled_array, num_features = segment_label(mask, structure=structure)
            if num_features == 0:
                continue

            label_val = k * nice_step
            if nice_step >= 1:
                label_text = f"{int(round(label_val))}"
            else:
                label_text = f"{label_val:.2f}".rstrip('0').rstrip('.')
            if label_text == '-0' or label_text == '': label_text = '0'

            # Collect all segments and their sizes
            segments = []
            for f_idx in range(1, num_features + 1):
                coords = np.argwhere(labeled_array == f_idx)
                if len(coords) >= 15:   # Only consider substantial lines so values are readable
                    segments.append(coords)

            if not segments:
                continue

            # Sort segments by length (longest first)
            segments.sort(key=lambda c: len(c), reverse=True)

            # Label EVERY substantial segment
            for seg_coords in segments:
                seg_len = len(seg_coords)
                # Number of labels proportional to segment length (1 label space every 250px)
                num_labels = max(1, seg_len // 250)

                for i in range(num_labels):
                    p_idx = seg_len * (2 * i + 1) // (2 * num_labels)
                    y_px, x_px = seg_coords[p_idx]
                    _draw_label(int(x_px), int(y_px), label_text)
    
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
