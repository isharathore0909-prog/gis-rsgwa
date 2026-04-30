import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import os
from scipy.ndimage import gaussian_filter, label as segment_label

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

    pts_x = np.array([p['x'] for p in points])
    pts_y = np.array([p['y'] for p in points])
    pts_v = np.array([p['v'] for p in points])

    if len(pts_x) > 1000:
        import pandas as pd
        df = pd.DataFrame({'x': pts_x, 'y': pts_y, 'v': pts_v})
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
        chunk_size = 1000
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

    grid_raw = idw_vectorized(pts_x, pts_y, pts_v, X, Y, p)
    grid = gaussian_filter(grid_raw, sigma=6.0)
    
    _tmin = np.percentile(grid, 2) if grid.size > 0 else 0
    _tmax = np.percentile(grid, 98) if grid.size > 0 else 10
    if _tmin == _tmax:
        _tmin, _tmax = np.min(grid), np.max(grid)
    if _tmin == _tmax:
        _tmax = _tmin + 1

    rough_step = (_tmax - _tmin) / 5.0
    if rough_step <= 0: rough_step = 1.0
    from math import log10
    magnitude = 10 ** np.floor(log10(rough_step)) if rough_step > 0 else 1
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
            rgb = b.get('rgb') or hex_to_rgb(b.get('color', '#FFFFFF'))
            mask = (grid >= b['min']) & (grid < b['max'])
            if i == len(buckets) - 1:
                mask = mask | (grid >= b['max'])
            data[mask, 0] = rgb[0]
            data[mask, 1] = rgb[1]
            data[mask, 2] = rgb[2]
            data[mask, 3] = 180

    data[is_line_grid, 0:3] = 0
    data[is_line_grid, 3] = 100

    mask_arr = None
    if boundary_geojson:
        mask_img = Image.new('L', (width, height), 0)
        draw_mask = ImageDraw.Draw(mask_img)

        def pt2px(lon, lat):
            px = ((lon - bounds['minX']) / (bounds['maxX'] - bounds['minX'])) * width
            py = height - ((lat - bounds['minY']) / (bounds['maxY'] - bounds['minY'])) * height
            return px, py

        features = boundary_geojson.get('features', [boundary_geojson]) if boundary_geojson.get('type') == 'FeatureCollection' else [boundary_geojson]
        has_polygons = False
        
        for f in features:
            geom = f.get('geometry', f)
            geom_type = geom.get('type', '')
            coords = geom.get('coordinates', [])
            polys = [coords] if geom_type == 'Polygon' else coords if geom_type == 'MultiPolygon' else []
            
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
            if boundary_geojson and mask_arr is not None:
                ix, iy = int(x_px), int(y_px)
                if 0 <= ix < width and 0 <= iy < height:
                    if mask_arr[iy, ix] == 0:
                        return
            if not (20 < x_px < width - 20 and 20 < y_px < height - 20):
                return
            if is_truetype:
                for dx, dy in [(-1,-1),(-1,1),(1,-1),(1,1),(-1,0),(1,0),(0,-1),(0,1)]:
                    draw.text((x_px + dx, y_px + dy), text, fill=(255, 255, 255, 220), font=font, anchor='mm')
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

        unique_levels = np.unique(contour_levels[is_line_grid])
        structure = np.ones((3,3), dtype=int)

        for k in unique_levels:
            mask = is_line_grid & (contour_levels == k)
            labeled_array, num_features = segment_label(mask, structure=structure)
            if num_features == 0: continue

            label_val = k * nice_step
            label_text = f"{int(round(label_val))}" if nice_step >= 1 else f"{label_val:.2f}".rstrip('0').rstrip('.')
            if label_text in ['-0', '']: label_text = '0'

            segments = []
            for f_idx in range(1, num_features + 1):
                coords = np.argwhere(labeled_array == f_idx)
                if len(coords) >= 15: segments.append(coords)

            if not segments: continue
            segments.sort(key=len, reverse=True)

            for seg_coords in segments:
                seg_len = len(seg_coords)
                num_labels = max(1, seg_len // 250)
                for i in range(num_labels):
                    p_idx = seg_len * (2 * i + 1) // (2 * num_labels)
                    y_px, x_px = seg_coords[p_idx]
                    _draw_label(int(x_px), int(y_px), label_text)
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
