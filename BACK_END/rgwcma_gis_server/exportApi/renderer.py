import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from shapely.geometry import box
import os
import math
import numpy as np
import sqlite3
import re
from shapely.wkt import loads as load_wkt
from shapely.wkb import loads as load_wkb
from django.conf import settings
from django.contrib.gis.geos import Polygon as GEOSPolygon, GEOSGeometry
from django.core.cache import cache
from django.db.models import Avg, Q

# Map frontend layer keys to physical files in data/
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

# Palettes (Synced with frontend constants - Improved visibility)
BLUE_PALETTE = [
    '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', 
    '#0369a1', '#075985', '#0c4a6e', '#1e40af', '#1e3a8a', '#172554', '#042f2e'
]

AQUIFER_COLORS = {
    'Younger Alluvium': '#f9eb0f', 'Older Alluvium': '#f8b195', 'Alluvium': '#4caf50',
    'Sandstone': '#f3722c', 'Schist': '#d84315', 'Phyllite & Schist': '#d84315',
    'Phyllite': '#d84315', 'Gneiss': '#ffb6c1', 'Banded Gneissic Complex': '#ffb6c1',
    'BGC': '#ffb6c1', 'Bilara Limestone': '#a0cfec', 'Deccan Trap': '#77dd77',
    'Basalt': '#77dd77', 'Granite': '#ff6961', 'Jodhpur Sandstone': '#fac898',
    'Lathi Sandstone': '#c1c6fc', 'Nagaur Sandstone': '#b0e0e6', 'Quartzite': '#f49ac2',
    'Ryolite': '#cb99c9', 'Rhyolite': '#cb99c9', 'Tertiary Sandstone': '#eaddca',
    'Vindhyan Limestone': '#0abab5', 'Vindhyan Sandstone': '#c23b22', 'Limestone': '#98fb98',
    'Shale': '#a9a9a9', 'Hills': '#808080', 'Hilly Area': '#808080'
}

GWRE_COLORS = {
    'safe': '#28a745', 'semi': '#ffc107', 'critical': '#fd7e14', 'over': '#dc3545',
    'saline': '#6c757d', 'default': '#3388ff'
}

class MapRenderer:
    def __init__(self, width_in=11.7, height_in=9.0):
        """Initialize with A4 Landscape dimensions or custom size."""
        self.width = width_in
        self.height = height_in
        self.target_crs = "EPSG:3857"
        self.active_thematic_items = {'gw': set(), 'aq': set()}

    def get_cached_gdf(self, layer_name):
        """Load and cache GeoDataFrame to avoid repeated file I/O and projection."""
        cache_key = f"map_gdf_{layer_name}"
        gdf = cache.get(cache_key)
        if gdf is not None:
            return gdf
        
        filename = LAYER_MAPPING.get(layer_name)
        if not filename:
            return None
            
        file_path = os.path.join(GEOJSON_PATH, filename)
        if not os.path.exists(file_path):
            return None
            
        try:
            gdf = gpd.read_file(file_path)
            gdf = self.normalize_to_3857(gdf)
            cache.set(cache_key, gdf, 3600)  # Cache for 1 hour
            return gdf
        except Exception as e:
            print(f"Error loading GDF {layer_name}: {e}")
            return None

    def meters_to_latlon(self, x, y):
        """Convert EPSG:3857 Web Mercator to EPSG:4326 Lat/Lon."""
        try:
            r = 6378137.0 # Earth radius
            lon = math.degrees(x / r)
            lat = math.degrees(2 * math.atan(math.exp(y / r)) - math.pi / 2.0)
            return lat, lon
        except:
            return 0, 0

    def normalize_name(self, name):
        """Standardize names for matching (remove spaces, dots, special chars, case insensitive)."""
        if not name: return ""
        return re.sub(r'[^A-Z0-9]', '', str(name).upper().strip())
        
    def normalize_to_3857(self, gdf):
        """
        Unified pipeline to clean, detect CRS, and reproject to target_crs (3857).
        Prevents double-projection errors by detecting if coords are already in meters.
        """
        if gdf is None or gdf.empty:
            return gdf
            
        print("---- RAW GDF DEBUG ----")
        print("CRS status:", gdf.crs)
        try:
            print("Bounds BEFORE CRS assignment/reprojection:", gdf.total_bounds)
        except: pass
        print("-----------------------")

        # 1. Automatic CRS detection if missing (Case: Proj double-projection fix)
        if gdf.crs is None:
            try:
                minx, _, maxx, _ = gdf.total_bounds
                # Range check based on Rajasthan coordinate magnitudes
                if abs(minx) <= 180 and abs(maxx) <= 180:
                    print("DEBUGGING: Lat/Lon coordinates detected (<180). Assigning EPSG:4326.")
                    gdf.set_crs("EPSG:4326", inplace=True)
                elif abs(minx) < 2_000_000 or abs(maxx) < 2_000_000:
                    # In India/Rajasthan, UTM Eastings are ~200k-800k. 
                    # Mercator Eastings are ~8M. 
                    # If it's in the hundreds of thousands, it's almost certainly UTM.
                    print(f"DEBUGGING: UTM magnitude detected ({minx:.0f}). Assigning EPSG:32643 (UTM 43N).")
                    gdf.set_crs("EPSG:32643", inplace=True)
                else:
                    # Large coordinates (>2M) -> Assume already Web Mercator
                    print(f"DEBUGGING: Large Mercator magnitude detected ({minx:.0f}). Assigning EPSG:3857.")
                    gdf.set_crs(self.target_crs, inplace=True)
            except Exception as e:
                print(f"DEBUGGING: CRS Detection failed, defaulting to 4326: {e}")
                gdf.set_crs("EPSG:4326", inplace=True)

        # 2. Fix geometries safely (buffer(0) destroys lines, so only apply to polygons/multipolygons)
        try:
            def fix_geom(g):
                if g is None or g.is_empty: return g
                # Only buffer polygons to fix self-intersection validity issues
                if g.geom_type in ['Polygon', 'MultiPolygon'] and not g.is_valid:
                    return g.buffer(0)
                return g
            gdf["geometry"] = gdf["geometry"].apply(fix_geom)
            # Comprehensive filter as requested to fix GeoPandas 0.14+ warnings
            gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()]
        except Exception as e:
            print(f"DEBUG: Geometry fix error: {e}")

        # 3. Final reprojection to target (Safe check to avoid inf bounds)
        if gdf.crs.to_epsg() != 3857:
            try:
                gdf = gdf.to_crs(self.target_crs)
            except Exception as e:
                print(f"DEBUG: Reprojection error: {e}")
        
        return gdf


    def _get_style(self, layer_name):
        """Return dict of matplotlib style arguments."""
        style = {
            'linewidth': 0.8,
            'edgecolor': '#555555',
            'facecolor': 'none', # Matplotlib 'none' means no fill
            'alpha': 1.0,
            'zorder': 2,
            'label': layer_name.replace('_', ' ').title()
        }
        
        mapping = {
            'waterbodies': {'facecolor': '#3b82f6', 'edgecolor': '#1d4ed8', 'alpha': 0.8, 'label': 'Waterbodies'},
            'canal': {'color': '#00bcd4', 'linewidth': 1.5, 'label': 'Canals'},
            'rivers': {'color': '#1e88e5', 'linewidth': 1.2, 'label': 'Rivers'},
            'aquifer': {'facecolor': '#ffcc00', 'edgecolor': '#ff9900', 'alpha': 0.5, 'label': 'Aquifer'},
            'groundwater': {'facecolor': '#a5d6a7', 'edgecolor': '#4caf50', 'alpha': 0.5, 'label': 'Groundwater Zones'},
            'region': {'edgecolor': '#e91e63', 'linewidth': 2.0, 'facecolor': 'none', 'label': 'Study Area'},
            'study': {'edgecolor': '#e91e63', 'linewidth': 2.0, 'facecolor': 'none', 'label': 'Study Area'},
            'district': {'edgecolor': '#2d3748', 'linewidth': 1.2, 'facecolor': 'none', 'label': 'District Boundary'},
            'state': {'edgecolor': '#000000', 'linewidth': 2.0, 'facecolor': 'none', 'label': 'State Boundary'},
            'block': {'edgecolor': '#334155', 'linewidth': 1.0, 'facecolor': 'none', 'label': 'Block Boundary'},
            'grampanchayat': {'edgecolor': '#475569', 'linewidth': 0.8, 'facecolor': 'none', 'label': 'Gram Panchayat Boundary'},
            'village': {'edgecolor': '#94a3b8', 'linewidth': 0.6, 'facecolor': 'none', 'label': 'Village Boundary'},
            'micro': {'facecolor': '#d1c4e9', 'edgecolor': '#673ab7', 'alpha': 0.4, 'label': 'Micro Watershed Boundary'}
        }
        
        for key, val in mapping.items():
            if key in layer_name:
                style.update(val)
                break
                
        if layer_name == 'study':
            style['label'] = getattr(self, 'custom_boundary_label', 'Study Area Boundary')
            
        return style

    def add_north_arrow(self, ax):
        """Add a custom North Arrow to Top-Right."""
        arrow_x, arrow_y = 0.93, 0.90
        ax.text(arrow_x, arrow_y + 0.04, 'N', transform=ax.transAxes, 
                ha='center', va='bottom', fontsize=18, fontweight='bold', zorder=100)
        
        path_x = [arrow_x, arrow_x - 0.02, arrow_x, arrow_x + 0.02]
        path_y = [arrow_y + 0.03, arrow_y - 0.03, arrow_y - 0.01, arrow_y - 0.03]
        
        poly = mpatches.Polygon(list(zip(path_x, path_y)), closed=True, 
                                facecolor='black', edgecolor='black', transform=ax.transAxes, zorder=100)
        ax.add_patch(poly)

    def add_scale_bar(self, ax):
        """Add a scale bar inside the map frame (Bottom-Right) with increased width."""
        minx, maxx = ax.get_xlim()
        width_m = maxx - minx
        
        # Calculate optimal scale width (Increased to approx 25% of map width)
        target_width_m = width_m * 0.25
        magnitude = 10 ** math.floor(math.log10(target_width_m))
        step = 5 if target_width_m / magnitude > 5 else 2 if target_width_m / magnitude > 2 else 1
        scale_width_m = step * magnitude
            
        scale_width_km = scale_width_m / 1000.0
        label = f"{int(scale_width_km)} km" if scale_width_km >= 1 else f"{int(scale_width_m)} m"
        
        # Calculate width relative to axes
        scale_fraction = scale_width_m / width_m
        
        # Positioning: Bottom-RIGHT corner INSIDE the frame
        start_x = 0.96 - scale_fraction
        bar_y = 0.04 
        bar_h = 0.018 # Slightly taller for better visibility
        block_w = scale_fraction / 4
        
        for i in range(4):
            color = 'black' if i % 2 == 0 else 'white'
            rect = mpatches.Rectangle((start_x + i * block_w, bar_y), block_w, bar_h, 
                                     facecolor=color, edgecolor='black', transform=ax.transAxes, zorder=150)
            ax.add_patch(rect)
        
        # Label above (Slightly larger font)
        ax.text(start_x + scale_fraction / 2, bar_y + bar_h * 1.15, label, 
                ha='center', va='bottom', fontsize=9, fontweight='bold', transform=ax.transAxes, zorder=150)
        
        # Ticks (0 and Max)
        ax.text(start_x, bar_y - 0.005, "0", ha='center', va='top', fontsize=8, transform=ax.transAxes, zorder=150)
        ax.text(start_x + scale_fraction, bar_y - 0.005, f"{int(scale_width_km)}", 
                ha='center', va='top', fontsize=8, transform=ax.transAxes, zorder=150)

    def add_legend(self, ax, used_layers):
        """Add legend to bottom-center with horizontal layout. Grouped with headers and vertical spacing."""
        from matplotlib.lines import Line2D
        # Increase ncol to 5 or even 6 for heavy thematic layers like Aquifers to save vertical space
        has_dense_layers = any(l in used_layers for l in ['aquifer', 'rainfall'])
        ncol = 6 if has_dense_layers else 4 
        handles = []
        
        # 1. Categorize standard layers (Deduplicated)
        boundary_handles, feature_handles = [], []
        thematic_keys = ['groundwater_zones', 'rainfall', 'aquifer', 'water_quality']
        line_keywords = ['canal', 'river', 'district', 'state', 'study', 'block', 'grampanchayat', 'village', 'micro']
        
        added_labels = set()
        for layer in used_layers:
            if layer in thematic_keys: continue
            style = self._get_style(layer)
            label = style.get('label', layer)
            if label in added_labels: continue
            
            if any(k in layer.lower() for k in line_keywords):
                color = style.get('color') or style.get('edgecolor') or 'black'
                boundary_handles.append(Line2D([0], [0], color=color, linewidth=style.get('linewidth', 1.5), label=label))
            else:
                feature_handles.append(mpatches.Patch(
                    facecolor=style.get('facecolor', 'none'), edgecolor=style.get('edgecolor', 'black'),
                    alpha=style.get('alpha', 1), linewidth=style.get('linewidth', 1), label=label
                ))
            added_labels.add(label)
        
        handles = boundary_handles + feature_handles
        
        def push_to_new_row(h_list, add_gap=False):
            if not h_list: return
            # Add a full empty row for spacing if vertical gap requested
            if add_gap and len(h_list) > 0:
                while len(h_list) % ncol != 0:
                    h_list.append(mpatches.Patch(visible=False, label=""))
                for _ in range(ncol):
                    h_list.append(mpatches.Patch(visible=False, label=""))
            else:
                while len(h_list) % ncol != 0:
                    h_list.append(mpatches.Patch(visible=False, label=""))

        # 2. Add Thematic Sections
        if 'groundwater_zones' in used_layers and self.active_thematic_items['gw']:
            push_to_new_row(handles, add_gap=True)
            handles.append(mpatches.Patch(visible=False, label=r"$\bf{GW\ Status:}$"))
            # Sort legend items logically
            order = ['Safe', 'Semi Critical', 'Critical', 'Over Exploited', 'Saline']
            g_colors = {'Safe': '#28a745', 'Semi Critical': '#ffc107', 'Critical': '#fd7e14', 'Over Exploited': '#dc3545', 'Saline': '#6c757d'}
            
            for item in order:
                if item in self.active_thematic_items['gw']:
                    handles.append(mpatches.Patch(facecolor=g_colors[item], label=item, edgecolor='#555'))

        if 'rainfall' in used_layers:
            push_to_new_row(handles, add_gap=True)
            handles.append(mpatches.Patch(visible=False, label=r"$\bf{Rainfall:}$"))
            # Display representative colors for the range
            handles.extend([mpatches.Patch(facecolor=BLUE_PALETTE[i], label=l, edgecolor='#555') 
                          for i, l in [(0, 'Low'), (5, 'Medium'), (11, 'High')]])
        
        if 'aquifer' in used_layers and self.active_thematic_items['aq']:
            push_to_new_row(handles, add_gap=True)
            handles.append(mpatches.Patch(visible=False, label=r"$\bf{Aquifer\ Types:}$"))
            for aq in sorted(list(self.active_thematic_items['aq'])):
                handles.append(mpatches.Patch(facecolor=AQUIFER_COLORS.get(aq, '#cccccc'), label=aq, edgecolor='#555'))
                
        if 'water_quality' in used_layers and hasattr(self, 'wq_buckets'):
            push_to_new_row(handles, add_gap=True)
            wq_param = self.active_thematic_items.get('wq_param', 'Water Quality')
            handles.append(mpatches.Patch(visible=False, label=r"$\bf{" + wq_param + r"\ Levels:}$"))
            for bucket in self.wq_buckets:
                # the actual label structure might vary but usually bucket['label'] for ranges
                bucket_label = bucket.get('label', '')
                bucket_color = bucket.get('color', '#cccccc')
                # Use standard hex formatting if it looks like rgb
                if bucket_color.startswith('rgb'):
                    try:
                        import ast
                        rgb_t = ast.literal_eval(bucket_color.replace('rgb', ''))
                        bucket_color = '#%02x%02x%02x' % rgb_t
                    except: pass
                if bucket_label:
                    handles.append(mpatches.Patch(facecolor=bucket_color, label=bucket_label, edgecolor='#555'))
            
        if handles:
            # Anchor slightly higher and use loc='upper center' to grow downward safely
            # Slightly smaller font (8.5) if many items
            fs = 8.5 if len(handles) > 15 else 9
            leg = ax.legend(handles=handles, loc='upper center', bbox_to_anchor=(0.5, -0.10),
                          frameon=True, fontsize=fs, edgecolor='#334155', fancybox=False, ncol=ncol, title='Legend')
            leg.get_frame().set_linewidth(1.2)
            leg.get_title().set(fontsize=11, fontweight='bold', ha='center')

    def _get_rainfall_stats(self, filters=None):
        """Fetch rainfall metrics at multiple hierarchical levels."""
        from django.db.models import Avg
        from rainfallApi.models import Rainfall
        
        stats = {
            'district': {}, # normalized_name: avg
            'block': {},    # (norm_dist, norm_block): avg
            'gp': {},       # (norm_dist, norm_block, norm_gp): avg
            'village': {}    # (norm_dist, norm_block, norm_gp, norm_vlg): avg
        }
        
        from rainfallApi.models import Rainfall, StationRainfall
        try:
            # Filter out extreme outliers
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

            # 1. District Stats (Combine Village and Station Data)
            # Preference given to Station data if available as per frontend logic
            d_records = raw_query.values('village__grampanchayat__block__district__name').annotate(avg=Avg('rainfall_mm'))
            for r in d_records:
                name = r.get('village__grampanchayat__block__district__name')
                if name: stats['district'][self.normalize_name(name)] = float(r['avg'] or 0.0)
            
            s_d_records = station_query.values('station__district').annotate(avg=Avg('rainfall_mm'))
            for r in s_d_records:
                name = r.get('station__district')
                # Overwrite/Prioritize station data
                if name: stats['district'][self.normalize_name(name)] = float(r['avg'] or 0.0)

            # 2. Block Stats (Village records only)
            b_records = raw_query.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name').annotate(avg=Avg('rainfall_mm'))
            for r in b_records:
                d, b = r.get('village__grampanchayat__block__district__name'), r.get('village__grampanchayat__block__name')
                if d and b: stats['block'][(self.normalize_name(d), self.normalize_name(b))] = float(r['avg'] or 0.0)

            # 3. GP Stats
            gp_records = raw_query.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name', 'village__grampanchayat__name').annotate(avg=Avg('rainfall_mm'))
            for r in gp_records:
                d, b, gp = r.get('village__grampanchayat__block__district__name'), r.get('village__grampanchayat__block__name'), r.get('village__grampanchayat__name')
                if d and b and gp: stats['gp'][(self.normalize_name(d), self.normalize_name(b), self.normalize_name(gp))] = float(r['avg'] or 0.0)

            # 4. Village Stats
            v_records = raw_query.values('village__grampanchayat__block__district__name', 'village__grampanchayat__block__name', 'village__grampanchayat__name', 'village__name').annotate(avg=Avg('rainfall_mm'))
            for r in v_records:
                d, b, gp, v = r.get('village__grampanchayat__block__district__name'), r.get('village__grampanchayat__block__name'), r.get('village__grampanchayat__name'), r.get('village__name')
                if d and b and gp and v: stats['village'][(self.normalize_name(d), self.normalize_name(b), self.normalize_name(gp), self.normalize_name(v))] = float(r['avg'] or 0.0)

            return stats
        except Exception as e:
            print(f"Hierarchical Rainfall Stats Error: {e}")
            return stats

    def _plot_thematic_rainfall(self, ax, clip_mask, filters=None):
        """Hierarchical thematic rainfall plotting (District -> Block -> GP -> Village)."""
        stats = self._get_rainfall_stats(filters)
        f = filters or {}
        
        from locationApi.models import District, Block, Grampanchayat, Village
        gdf = None
        current_level = 'district'
        
        try:
            # Determine level based on filters
            if f.get('village'):
                # Selected a village -> show children of that village? No, usually show the village itself.
                # In thematic maps, we usually show one level deeper than selected.
                current_level = 'village'
                items = Village.objects.filter(name__iexact=f['village'], grampanchayat__name__iexact=f.get('gramPanchayat') or f.get('grampanchayat'))
            elif f.get('gramPanchayat') or f.get('grampanchayat'):
                current_level = 'village' # GP selected -> show villages
                gp_name = f.get('gramPanchayat') or f.get('grampanchayat')
                items = Village.objects.filter(grampanchayat__name__iexact=gp_name, grampanchayat__block__name__iexact=f.get('block'))
            elif f.get('block'):
                current_level = 'grampanchayat' # Block selected -> show GPs
                items = Grampanchayat.objects.filter(block__name__iexact=f['block'], block__district__name__iexact=f.get('district'))
            elif f.get('district') and f.get('district').lower() != 'rajasthan':
                current_level = 'block' # District selected -> show blocks
                items = Block.objects.filter(district__name__iexact=f['district'])
            else:
                current_level = 'district' # State view -> show districts
                items = District.objects.all()

            items = items.exclude(geometry=None)
            if items.exists():
                print(f"Hierarchical View: Fetching {items.count()} {current_level} items from DB")
                rows = []
                for i in items:
                    try:
                        if not i.geometry: continue
                        # Use GEOSGeometry to WKT/WKB for shapely
                        geom_shapely = load_wkb(bytes(i.geometry.wkb))
                        if not geom_shapely.is_valid: geom_shapely = geom_shapely.buffer(0)
                        
                        row = {'geometry': geom_shapely, 'name': i.name}
                        if current_level == 'district':
                            row['d_norm'] = self.normalize_name(i.name)
                        elif current_level == 'block':
                            row['d_norm'] = self.normalize_name(i.district.name)
                            row['b_norm'] = self.normalize_name(i.name)
                        elif current_level == 'grampanchayat':
                            row['d_norm'] = self.normalize_name(i.block.district.name)
                            row['b_norm'] = self.normalize_name(i.block.name)
                            row['gp_norm'] = self.normalize_name(i.name)
                        elif current_level == 'village':
                            row['d_norm'] = self.normalize_name(i.grampanchayat.block.district.name)
                            row['b_norm'] = self.normalize_name(i.grampanchayat.block.name)
                            row['gp_norm'] = self.normalize_name(i.grampanchayat.name)
                            row['v_norm'] = self.normalize_name(i.name)
                        rows.append(row)
                    except Exception as ex: 
                        print(f"DEBUG: Thematic row error: {ex}")
                        continue
                
                if rows:
                    gdf = gpd.GeoDataFrame(rows)
                    gdf = self.normalize_to_3857(gdf)

        except Exception as e:
            print(f"DEBUG: Thematic DB Fetch Error: {e}")

        if gdf is None or gdf.empty:
            print(f"DEBUG: No thematic data for {current_level}")
            return False
        
        if clip_mask is not None:
            try:
                # Ensure clip_mask is valid before clipping
                if not clip_mask.is_valid: clip_mask = clip_mask.buffer(0)
                gdf_clipped = gpd.clip(gdf, clip_mask)
                if not gdf_clipped.empty:
                    gdf = gdf_clipped
            except Exception as e:
                print(f"DEBUG: Clipping thematic rainfall failed: {e}")
            
        colors = []
        plot_vals = []
        
        for _, row in gdf.iterrows():
            d_norm, b_norm = row.get('d_norm'), row.get('b_norm')
            gp_norm, v_norm = row.get('gp_norm'), row.get('v_norm')
            
            val = None
            if v_norm: val = stats['village'].get((d_norm, b_norm, gp_norm, v_norm))
            if val is None and gp_norm: val = stats['gp'].get((d_norm, b_norm, gp_norm))
            if val is None and b_norm: val = stats['block'].get((d_norm, b_norm))
            if val is None and d_norm: val = stats['district'].get(d_norm)
            
            p_val = float(val) if val is not None else 0.0
            plot_vals.append(p_val)

        def get_rainfall_color(mm):
            """Matched exactly to frontend getRainfallColor logic."""
            if mm is None: return '#cbd5e1'
            if mm <= 0: return BLUE_PALETTE[0]
            if mm < 2.5: return BLUE_PALETTE[2]
            if mm < 7.6: return BLUE_PALETTE[4]
            if mm < 15: return BLUE_PALETTE[6]
            if mm < 35.6: return BLUE_PALETTE[8]
            if mm < 64.5: return BLUE_PALETTE[10]
            return BLUE_PALETTE[11]

        colors = [get_rainfall_color(v) for v in plot_vals]
        gdf.plot(ax=ax, color=colors, edgecolor='#1e293b', linewidth=0.2, zorder=1)
        return True

    def _plot_thematic_water_quality(self, ax, bounds_3857, clip_mask, filters=None):
        f = filters or {}
        params = []
        if f.get('showEC'): params.append('ec')
        if f.get('showNitrate'): params.append('nitrate')
        if f.get('showFluoride'): params.append('fluoride')
        if f.get('showTDS'): params.append('tds')
        
        if not params:
            print("DEBUG: No WQ parameters selected in filters")
            return False

        from water_qualityApi.models import WaterQuality
        from core.services.mapping import generate_contour_map, get_parameter_analysis, utm_to_latlon
        from shapely.geometry import box
        import json, math, base64, io
        from PIL import Image
        from django.db.models import Q, F

        try:
            boundary_geojson = json.loads(gpd.GeoSeries([clip_mask], crs="EPSG:3857").to_crs("EPSG:4326").to_json()) if clip_mask else None
            # Need raw Feature array or dict
            if boundary_geojson and 'features' in boundary_geojson:
                boundary_geojson = boundary_geojson['features'][0]['geometry'] 

            b_min_x, b_min_y, b_max_x, b_max_y = bounds_3857
            bounds_gdf = gpd.GeoDataFrame({'geometry': [box(b_min_x, b_min_y, b_max_x, b_max_y)]}, crs="EPSG:3857")
            bounds_4326 = bounds_gdf.to_crs("EPSG:4326").total_bounds
            min_lon, min_lat, max_lon, max_lat = bounds_4326

            padding = (max_lon - min_lon) * 0.2
            search_min_x, search_max_x = min_lon - padding, max_lon + padding
            search_min_y, search_max_y = min_lat - padding, max_lat + padding

            spatial_query = Q(latitude__range=(search_min_y, search_max_y), longitude__range=(search_min_x, search_max_x))

            dist = f.get('district')
            block = f.get('block')
            gp = f.get('grampanchayat') or f.get('gramPanchayat')

            loc_query = Q()
            if gp:
                loc_query = Q(village__grampanchayat__name__iexact=gp)
            elif block:
                loc_query = Q(village__grampanchayat__block__name__iexact=block)
            elif dist and dist.lower() != 'rajasthan':
                loc_query = Q(village__grampanchayat__block__district__name__iexact=dist)

            for p_name in params:
                param = p_name.lower()
                raw_pts = WaterQuality.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(param))
                
                pts = []
                for p in raw_pts:
                    lat, lon, val = p.get('latitude'), p.get('longitude'), p.get('val')
                    if lat is None or lon is None or val is None: continue
                    if abs(float(lat)) < 0.001 and abs(float(lon)) < 0.001: continue
                    if isinstance(val, (float, int)) and (math.isnan(val) or math.isinf(val)): continue
                    if lon > 200 or lat > 100: lon, lat = utm_to_latlon(lon, lat)
                    pts.append({'lat': lat, 'lon': lon, 'val': val})

                if not pts: continue

                analysis = get_parameter_analysis(param, [p['val'] for p in pts])

                width, height = 1200, 1000  # High res for PDF
                dx = max_lon - min_lon or 0.01
                dy = max_lat - min_lat or 0.01
                
                proj_bounds = {
                    'minX': min_lon - dx * 0.05,
                    'maxX': max_lon + dx * 0.05,
                    'minY': min_lat - dy * 0.05,
                    'maxY': max_lat + dy * 0.05
                }
                
                def project_pt(lon, lat, pb):
                    px = ((lon - pb['minX']) / (pb['maxX'] - pb['minX'])) * width
                    py = height - ((lat - pb['minY']) / (pb['maxY'] - pb['minY'])) * height
                    return px, py

                proj_pts = []
                for p in pts:
                    px, py = project_pt(p['lon'], p['lat'], proj_bounds)
                    proj_pts.append({'x': px, 'y': py, 'v': p['val']})

                # Calculate corresponding EPSG 3857 bounds exactly corresponding to the padded proj_bounds (which is in 4326)
                img_bounds_gdf = gpd.GeoDataFrame({'geometry': [box(proj_bounds['minX'], proj_bounds['minY'], proj_bounds['maxX'], proj_bounds['maxY'])]}, crs="EPSG:4326")
                img_bounds_3857 = img_bounds_gdf.to_crs("EPSG:3857").total_bounds

                heatmap_b64 = generate_contour_map(
                    proj_pts, proj_bounds, width, height, p=2.5,
                    buckets=analysis['buckets'], show_labels=not analysis['is_quality'],
                    boundary_geojson=boundary_geojson
                )
                
                if heatmap_b64 and heatmap_b64.startswith("data:"):
                    b64_str = heatmap_b64.split(",")[1]
                    img_data = base64.b64decode(b64_str)
                    img = Image.open(io.BytesIO(img_data))
                    
                    # Matplotlib uses Web Mercator coordinates here!
                    extent = [img_bounds_3857[0], img_bounds_3857[2], img_bounds_3857[1], img_bounds_3857[3]]
                    ax.imshow(img, extent=extent, zorder=1.5, alpha=0.8)
                    self.active_thematic_items['wq_param'] = param.upper() 
                    self.wq_buckets = analysis['buckets']
                    
            return True
        except Exception as e:
            print(f"DEBUG: Water Quality Rendering Error: {e}")
            return False




    def _add_labels(self, ax, gdf, label_col='name', fontsize=7):
        """Add non-overlapping labels to polygon centroids."""
        from matplotlib.patheffects import withStroke
        for _, row in gdf.iterrows():
            if row.geometry and not row.geometry.is_empty:
                name = str(row.get(label_col) or "").strip()
                if not name or len(name) < 2: continue
                
                try:
                    # Use centroid for label positioning
                    c = row.geometry.centroid
                    if c is None or c.is_empty:
                        continue
                    
                    # Ensure coordinates are finite numbers
                    if not (math.isfinite(c.x) and math.isfinite(c.y)):
                        continue

                    txt = ax.text(c.x, c.y, name, fontsize=fontsize, ha='center', va='center',
                            fontweight='bold', color='#1e293b', zorder=30)
                    txt.set_path_effects([withStroke(linewidth=2, foreground='white', alpha=0.8)])
                except Exception as ex:
                    print(f"DEBUG: Label error for {name}: {ex}")
                    continue

    def render(self, bbox, layers, output_file, title="Map", custom_styles=None, filters=None):
        """Professional rendering pipeline with hierarchy-aware labels and clean layout."""
        # Reset tracking
        self.active_thematic_items = {'gw': set(), 'aq': set()}
        f = filters or {}
        
        # 1. Setup Figure
        fig, ax = plt.subplots(figsize=(self.width, self.height))
        fig.patch.set_facecolor('#fdfdfd')
        
        # 2. Determine Scope & Clipping
        from locationApi.models import State, District, Block, Grampanchayat, Village
        clip_mask = None
        bounds_3857 = None
        
        try:
            target_obj = None
            dist_name = f.get('district')
            block_name = f.get('block')
            
            if f.get('village'):
                v_items = Village.objects.filter(name__iexact=f['village'])
                if dist_name and dist_name.lower() != 'rajasthan':
                    v_items = v_items.filter(grampanchayat__block__district__name__iexact=dist_name)
                if block_name:
                    v_items = v_items.filter(grampanchayat__block__name__iexact=block_name)
                target_obj = v_items.first()
            elif f.get('gramPanchayat') or f.get('grampanchayat'):
                gp_name = f.get('gramPanchayat') or f.get('grampanchayat')
                gp_items = Grampanchayat.objects.filter(name__iexact=gp_name)
                if dist_name and dist_name.lower() != 'rajasthan':
                    gp_items = gp_items.filter(block__district__name__iexact=dist_name)
                if block_name:
                    gp_items = gp_items.filter(block__name__iexact=block_name)
                target_obj = gp_items.first()
            elif f.get('block'):
                # Disambiguate block by district if available
                dist_name = f.get('district')
                if dist_name and dist_name.lower() != 'rajasthan':
                    target_obj = Block.objects.filter(name__iexact=f['block'], district__name__iexact=dist_name).first()
                if not target_obj:
                    target_obj = Block.objects.filter(name__iexact=f['block']).first()
            elif f.get('district') and f.get('district').lower() != 'rajasthan':
                target_obj = District.objects.filter(name__iexact=f['district']).first()

            if not target_obj:
                search_name = f.get('village') or f.get('block') or f.get('district') or f.get('gramPanchayat') or f.get('grampanchayat')
                
                fallback_file = None
                name_col = 'name'
                
                if search_name:
                    # Fallback: Try searching in GeoJSON files if DB is empty or object not found
                    print(f"DEBUG: '{search_name}' not found in DB, trying GeoJSON fallback")
                    
                    if f.get('village'):
                        fallback_file = os.path.join(GEOJSON_PATH, 'villages.geojson')
                    elif f.get('grampanchayat') or f.get('gramPanchayat'):
                        fallback_file = os.path.join(GEOJSON_PATH, 'gram_panchayat.geojson')
                    elif f.get('block'):
                        fallback_file = os.path.join(GEOJSON_PATH, 'block_boundary_updated.json')
                    elif f.get('district') and f.get('district').lower() != 'rajasthan':
                        fallback_file = os.path.join(GEOJSON_PATH, 'Final_Dist_Boundary.geojson')
                        name_col = 'DISTRICT' 
                    elif f.get('district') == 'Rajasthan' or not search_name:
                        # State level fallback
                        fallback_file = os.path.join(GEOJSON_PATH, 'Rajasthan.geojson')

                if fallback_file and os.path.exists(fallback_file):
                    try:
                        temp_gdf = gpd.read_file(fallback_file)
                        if search_name and search_name.strip():
                            # Fuzzy Case insensitive search
                            match_idx = None
                            cols_to_check = [name_col, 'name', 'NAME', 'District', 'Block', 'block_name', 'dist_name', 'VIL_NAME', 'GP_NAME', 'DISTRICT', 'BLOCK']
                            
                            for col in [c for c in cols_to_check if c in temp_gdf.columns]:
                                # Exact match check
                                exact_matches = temp_gdf[temp_gdf[col].astype(str).str.upper() == search_name.upper()]
                                if not exact_matches.empty:
                                    match_idx = exact_matches.index[0]
                                    break
                                
                                # Contains check if exact fails
                                fuzzy_matches = temp_gdf[temp_gdf[col].astype(str).str.contains(search_name, case=False, na=False)]
                                if not fuzzy_matches.empty:
                                    match_idx = fuzzy_matches.index[0]
                                    break
                            
                            if match_idx is not None:
                                geom_4326 = temp_gdf.geometry.loc[match_idx]
                                if geom_4326:
                                    # Use normalization utility
                                    gdf_target = gpd.GeoDataFrame([{'geometry': geom_4326}])
                                    gdf_target = self.normalize_to_3857(gdf_target)
                                    
                                    clip_mask = gdf_target.geometry.unary_union
                                    if clip_mask and not clip_mask.is_empty:
                                        bounds_3857 = gdf_target.total_bounds
                                        print(f"DEBUG: Scope set via Fallback File for {search_name}: {bounds_3857}")
                    except Exception as fe:
                        print(f"DEBUG: Fallback file error: {fe}")

            if target_obj and target_obj.geometry:
                try:
                    # Normalize target for bounds
                    gdf_target = gpd.GeoDataFrame([{'geometry': load_wkb(bytes(target_obj.geometry.wkb))}])
                    gdf_target = self.normalize_to_3857(gdf_target)
                    
                    clip_mask = gdf_target.geometry.unary_union
                    
                    if clip_mask and not clip_mask.is_empty:
                        bounds_3857 = gdf_target.total_bounds
                        print(f"DEBUG: Scope set for {target_obj.name} ({target_obj._meta.model_name}): {bounds_3857}")
                except Exception as ex:
                    print(f"DEBUG: Geometry conversion error for {target_obj}: {ex}")
        except Exception as e:
            print(f"DEBUG: Scope resolution error: {e}")

        # 3. Robust Viewport Logic (Bulletproof)
        def is_valid_bounds(b):
            if b is None or not hasattr(b, '__len__') or len(b) != 4:
                return False
            for x in b:
                if x is None: return False
                try:
                    val = float(x)
                    if not math.isfinite(val): return False
                except: return False
            return True


        if not is_valid_bounds(bounds_3857):
            print(f"Invalid bounds_3857 ({bounds_3857}), falling back to frontend bbox")
            # Fallback 1: Use bbox from frontend if valid
            try:
                gdf_bbox = gpd.GeoDataFrame({'geometry': [box(*bbox)]})
                gdf_bbox = self.normalize_to_3857(gdf_bbox)
                bounds_3857 = gdf_bbox.total_bounds
                print(f"Fallback 1 bounds: {bounds_3857}")
            except Exception as e: 
                print(f"Fallback 1 error: {e}")
                pass

        if not is_valid_bounds(bounds_3857):
            print("Fallback 1 also invalid, using Rajasthan default")
            # Fallback 2: Rajasthan Center Bound
            bounds_3857 = [7700000, 2600000, 8750000, 3550000]


        # 3. Handle Constraints & Viewport
        minx, miny, maxx, maxy = bounds_3857
        # Ensure non-zero width/height
        if maxx == minx: maxx += 1000; minx -= 1000
        if maxy == miny: maxy += 1000; miny -= 1000
        # Add 5% padding
        pad_x, pad_y = (maxx - minx) * 0.05, (maxy - miny) * 0.05
        ax.set_xlim(minx - pad_x, maxx + pad_x)
        ax.set_ylim(miny - pad_y, maxy + pad_y)
        ax.set_aspect('equal')

        # 4. Background / Context (Rajasthan state boundary)
        try:
            state_items = State.objects.exclude(geometry=None)
            rows = []
            if not state_items.exists():
                # Fallback to loading from file if DB is empty
                state_file = os.path.join(GEOJSON_PATH, LAYER_MAPPING.get('state', 'Rajasthan.geojson'))
                if os.path.exists(state_file):
                    print(f"DEBUG: State DB empty, loading from {state_file}")
                    gdf_bg = gpd.read_file(state_file)
                    gdf_bg = self.normalize_to_3857(gdf_bg)
                else:
                    gdf_bg = None
            else:
                for s in state_items:
                    try:
                        g = load_wkb(bytes(s.geometry.wkb))
                        if g: rows.append({'geometry': g})
                    except: continue
                if rows:
                    gdf_bg = gpd.GeoDataFrame(rows)
                    gdf_bg = self.normalize_to_3857(gdf_bg)
                else:
                    gdf_bg = None
            
            if gdf_bg is not None and not gdf_bg.empty:
                # If a specific region is selected, we don't want to show the whole state background
                if clip_mask and not clip_mask.is_empty:
                    # Clip background to the target to avoid showing context outside the district
                    gdf_bg = gpd.clip(gdf_bg, clip_mask)
                
                if not gdf_bg.empty:
                    style = self._get_style('state')
                    gdf_bg.plot(ax=ax, color='#f8fafc', edgecolor='#334155', linewidth=style.get('linewidth', 2.0), zorder=0)
        except Exception as e: 
            print(f"DEBUG: Background plot error: {e}")

        # 5. Layer Drawing Order
        # Thematic (bottom) -> Basic Features -> Boundaries -> Labels (top)
        used_layers = []
        ordered_layers = []
        
        # Priority mapping
        for layer in layers:
            if layer == 'rainfall': ordered_layers.insert(0, layer)
            elif layer in ['groundwater_zones', 'aquifer']: ordered_layers.insert(0, layer)
            else: ordered_layers.append(layer)

        for layer in ordered_layers:
            if layer == 'rainfall':
                if self._plot_thematic_rainfall(ax, clip_mask, filters): used_layers.append(layer)
                continue
            elif layer == 'water_quality':
                if self._plot_thematic_water_quality(ax, bounds_3857, clip_mask, filters): used_layers.append(layer)
                continue
            
            from layersApi.models import SpatialLayer
            gdf = None
            
            # Fetch from SpatialLayer or Core Models
            # Efficiently fetch only overlapping records
            try:
                query_box = GEOSPolygon.from_bbox(bbox)
                db_spatial = SpatialLayer.objects.filter(name__iexact=layer, geometry__intersects=query_box)
                if not db_spatial.exists():
                    db_spatial = SpatialLayer.objects.filter(name__iexact=layer)
            except:
                db_spatial = SpatialLayer.objects.filter(name__iexact=layer)
                
            if db_spatial.exists():
                gdf = gpd.GeoDataFrame([{'geometry': load_wkt(l.geometry.wkt), **l.properties} for l in db_spatial])
                gdf = self.normalize_to_3857(gdf)
            elif layer in ['district', 'block', 'grampanchayat', 'village']:
                # Efficient Spatial Filtering
                model_cls = {
                    'district': District,
                    'block': Block,
                    'grampanchayat': Grampanchayat,
                    'village': Village
                }.get(layer, District)
                items = model_cls.objects.exclude(geometry=None)
                
                # 1. Filter by Name if in filters (Hierarchical)
                if f.get('district') and f.get('district').lower() != 'rajasthan':
                    if layer == 'district':
                        items = items.filter(name__iexact=f['district'])
                    elif layer == 'block':
                        items = items.filter(district__name__iexact=f['district'])
                    elif layer == 'grampanchayat':
                        items = items.filter(block__district__name__iexact=f['district'])
                    elif layer == 'village':
                        items = items.filter(grampanchayat__block__district__name__iexact=f['district'])
                
                if f.get('block') and layer in ['block', 'grampanchayat', 'village']:
                    if layer == 'block':
                        items = items.filter(name__iexact=f['block'])
                    elif layer == 'grampanchayat':
                        items = items.filter(block__name__iexact=f['block'])
                    elif layer == 'village':
                        items = items.filter(grampanchayat__block__name__iexact=f['block'])

                if (f.get('grampanchayat') or f.get('gramPanchayat')) and layer in ['grampanchayat', 'village']:
                    gp_name = f.get('grampanchayat') or f.get('gramPanchayat')
                    if layer == 'grampanchayat':
                        items = items.filter(name__iexact=gp_name)
                    elif layer == 'village':
                        items = items.filter(grampanchayat__name__iexact=gp_name)

                if f.get('village') and layer == 'village':
                    items = items.filter(name__iexact=f['village'])

                # 2. Additional Spatial Filter
                if clip_mask and items.count() > 100:
                    try:
                        items = items.filter(geometry__intersects=GEOSPolygon.from_bbox(bbox))
                    except: pass

                rows = []
                for i in items:
                    try:
                        if not i.geometry: continue
                        g = load_wkb(bytes(i.geometry.wkb))
                        if not g.is_valid: g = g.buffer(0)
                        if g: rows.append({'geometry': g, 'name': i.name})
                    except Exception as ex:
                        print(f"DEBUG: Error loading {layer} {i.name}: {ex}")
                        continue
                if rows:
                    gdf = gpd.GeoDataFrame(rows)
                    gdf = self.normalize_to_3857(gdf)


            if gdf is None or gdf.empty:
                # File Fallback for missing database records
                filename = LAYER_MAPPING.get(layer)
                if filename:
                    file_path = os.path.join(GEOJSON_PATH, filename)
                    if os.path.exists(file_path):
                        print(f"DEBUG: Layer '{layer}' empty in DB, loading fallback from: {file_path}")
                        try:
                            gdf = gpd.read_file(file_path)
                            gdf = self.normalize_to_3857(gdf)
                        except Exception as fe:
                            print(f"DEBUG: Error loading layer file {file_path}: {fe}")
                            continue

            if gdf is None or gdf.empty:
                continue
            
            if clip_mask:
                # Proper geometric clipping
                gdf = gpd.clip(gdf, clip_mask)
            
            if gdf.empty: continue
            
            style = self._get_style(layer)
            if layer == 'groundwater_zones':
                colors = []
                for _, row in gdf.iterrows():
                    # Check multiple possible property names for status
                    status = str(row.get('GWDL') or row.get('Category') or row.get('Stage_of_G') or row.get('status') or '').lower()
                    color, label = GWRE_COLORS['default'], 'Default'
                    
                    if 'safe' in status: color, label = GWRE_COLORS['safe'], 'Safe'
                    elif 'semi' in status: color, label = GWRE_COLORS['semi'], 'Semi Critical'
                    elif 'critical' in status: color, label = GWRE_COLORS['critical'], 'Critical'
                    elif 'over' in status: color, label = GWRE_COLORS['over'], 'Over Exploited'
                    elif 'saline' in status: color, label = GWRE_COLORS['saline'], 'Saline'
                    
                    colors.append(color)
                    if label != 'Default': self.active_thematic_items['gw'].add(label)
                
                gdf.plot(ax=ax, color=colors, edgecolor='#1e293b', linewidth=0.3, alpha=0.85, zorder=2)
                used_layers.append(layer)
            elif layer == 'aquifer':
                colors = []
                for _, row in gdf.iterrows():
                    name = str(row.get('Aquifer') or "").strip()
                    self.active_thematic_items['aq'].add(name)
                    color = next((c for k, c in AQUIFER_COLORS.items() if k.lower() == name.lower()), '#cbd5e1')
                    colors.append(color)
                gdf.plot(ax=ax, color=colors, edgecolor='#1e293b', linewidth=0.2, alpha=0.85, zorder=2)
                used_layers.append(layer)
            else:
                plot_kwargs = {k:v for k,v in style.items() if k != 'label'}
                gdf.plot(ax=ax, **plot_kwargs)
                used_layers.append(layer)
                
                # Add Labels for Boundaries if zoomed in enough
                if layer in ['district', 'block', 'grampanchayat', 'village'] and len(gdf) < 60:
                    self._add_labels(ax, gdf, label_col='name', fontsize=8)

        # 5.5 Highlight Study Area (The specific district/block/gp/village selected)
        if clip_mask and not clip_mask.is_empty:
            try:
                gdf_study = gpd.GeoDataFrame([{'geometry': clip_mask}], crs=self.target_crs)
                # Outer glow/border for study area
                gdf_study.plot(ax=ax, facecolor='none', edgecolor='#e91e63', linewidth=2.5, zorder=15, linestyle='-')
                gdf_study.plot(ax=ax, facecolor='none', edgecolor='white', linewidth=4.0, zorder=14, alpha=0.3)
                
                # Dynamic boundary label
                boundary_label = "Study Area Boundary"
                if f.get('village'): boundary_label = "Village Boundary"
                elif f.get('grampanchayat') or f.get('gramPanchayat'): boundary_label = "Gram Panchayat Boundary"
                elif f.get('block'): boundary_label = "Block Boundary"
                elif f.get('district') and f.get('district').lower() != 'rajasthan': boundary_label = "District Boundary"
                elif f.get('district') and f.get('district').lower() == 'rajasthan': boundary_label = "State Boundary"
                
                self.custom_boundary_label = boundary_label
                if 'study' not in used_layers:
                    used_layers.append('study')
                    
            except Exception as e:
                print(f"DEBUG: Highlight study area failed: {e}")

        # 6. Final Polish (Arrows, Scale, Legend)
        self.add_north_arrow(ax)
        self.add_scale_bar(ax)
        if used_layers:
            self.add_legend(ax, used_layers)
        
        # Frame and Grid Formatting
        for spine in ax.spines.values():
            spine.set_edgecolor('#334155')
            spine.set_linewidth(1.5)
        
        # Labels should only be shown if we have valid finite limits
        try:
            xticks = np.linspace(ax.get_xlim()[0], ax.get_xlim()[1], 5)
            yticks = np.linspace(ax.get_ylim()[0], ax.get_ylim()[1], 6)
            ax.set_xticks(xticks)
            ax.set_yticks(yticks)
            
            cx, cy = (ax.get_xlim()[0] + ax.get_xlim()[1]) / 2, (ax.get_ylim()[0] + ax.get_ylim()[1]) / 2
            
            ax.set_xticklabels([f"{self.meters_to_latlon(x, cy)[1]:.2f}°E" for x in xticks], fontsize=8, color='#64748b')
            ax.set_yticklabels([f"{self.meters_to_latlon(cx, y)[0]:.2f}°N" for y in yticks], fontsize=8, color='#64748b')
            ax.grid(True, linestyle='--', alpha=0.3, zorder=1)
        except Exception as e:
            print(f"DEBUG: Labeling error: {e}")

        # 7. Title & Save
        region_label = f.get('village') or f.get('grampanchayat') or f.get('gramPanchayat') or f.get('block') or f.get('district') or "Rajasthan"
        date_range = f" | Filtered: {f.get('dataRangeStart')} to {f.get('dataRangeEnd')}" if f.get('dataRangeStart') else ""
        
        # Determine thematic prefix based on active layers
        thematic_prefix = ""
        if 'rainfall' in used_layers:
            thematic_prefix = "RAINFALL "
        elif 'water_quality' in used_layers:
            thematic_prefix = f"WATER QUALITY ({self.active_thematic_items.get('wq_param', '')}) "
        elif 'aquifer' in used_layers:
            thematic_prefix = "AQUIFER "
        elif 'groundwater_zones' in used_layers:
            thematic_prefix = "GROUNDWATER ZONE "
        elif 'micro' in used_layers:
            thematic_prefix = "MICRO WATERSHED "
        elif 'waterbodies' in used_layers:
            thematic_prefix = "WATER BODIES "
        elif 'canals' in used_layers:
            thematic_prefix = "CANALS "
        elif 'rivers' in used_layers:
            thematic_prefix = "RIVERS "
        elif 'dams' in used_layers:
            thematic_prefix = "DAMS "
        
        full_title = f"{thematic_prefix}{title}".strip().upper()
        
        plt.figtext(0.5, 0.96, full_title, ha='center', fontsize=20, fontweight='bold', color='#0f172a')
        plt.figtext(0.5, 0.93, f"Region: {region_label}{date_range}", ha='center', fontsize=12, color='#475569')
        

        
        # Increase bottom margin significantly to accommodate long legends (especially Aquifers)
        plt.subplots_adjust(left=0.08, right=0.95, top=0.92, bottom=0.35)
        plt.savefig(output_file, format='pdf', dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
        plt.close(fig)
        return output_file
