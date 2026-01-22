import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from shapely.geometry import box
import os
from django.conf import settings
import math
import numpy as np

# Map frontend layer keys to physical files in public/
GEOJSON_PATH = os.path.join(settings.BASE_DIR, '..', '..', 'FRONT_END', 'public')

LAYER_MAPPING = {
    'rivers': 'rivers.geojson', 
    'canals': 'data/canals_opt.json',          
    'waterbodies': 'data/waterbodies_opt.json',
    'groundwater_zones': 'groundwater_zone.json',
    'micro': 'micro.json',
    'aquifer': 'data/aquifer_opt.json',
    'rainfall': 'rainfall_data.json',
    'dams': 'dams.geojson',
    'state': 'Rajasthan.geojson',
    'district': 'Final_Dist_Boundary.geojson',
    'block': 'block_boundary_updated.json'
}


# Palettes
BLUE_PALETTE = [
    '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
    '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'
]

AQUIFER_COLORS = {
    'Younger Alluvium': '#f9eb0f', 'Older Alluvium': '#f8b195', 'Alluvium': '#4caf50',
    'Sandstone': '#f3722c', 'Schist': '#d84315', 'Phyllite & Schist': '#d84315',
    'Phyllite': '#d84315', 'Gneiss': '#ffb6c1', 'Banded Gneissic Complex': '#ffb6c1',
    'BGC': '#ffb6c1', 'Bilara Limestone': '#a0cfec', 'Deccan Trap': '#77dd77',
    'Basalt': '#77dd77', 'Granite': '#ff6961', 'Jodhpur Sandstone': '#fac898',
    'Lathi Sandstone': '#c1c6fc', 'Nagaur Sandstone': '#b0e0e6', 'Quartzite': '#f49ac2',
    'Ryolite': '#cb99c9', 'Rhyolite': '#cb99c9', 'Tertiary Sandstone': '#eaddca',
    'Vindhyan Limestone': '#0abab5', 'Vindhyan Sandstone': '#c23b22',
    'Limestone': '#98fb98', 'Shale': '#a9a9a9', 'Hills': '#808080', 'Hilly Area': '#808080'
}

class MapRenderer:
    def __init__(self, width_in=11.7, height_in=8.3): # A4 Landscape
        self.width = width_in
        self.height = height_in
        
    def _get_style(self, layer_name):
        """Return dict of matplotlib style arguments"""
        style = {
            'linewidth': 0.8,
            'edgecolor': '#555555',
            'facecolor': 'none',
            'alpha': 1.0,
            'label': layer_name.replace('_', ' ').title()
        }
        
        if 'waterbodies' in layer_name:
            style.update({'facecolor': '#a0c8f0', 'edgecolor': '#2196f3', 'alpha': 0.6, 'label': 'Waterbodies'})
        elif 'canal' in layer_name:
            style.update({'color': '#00bcd4', 'linewidth': 1.5, 'label': 'Canals'})
        elif 'rivers' in layer_name:
             style.update({'color': '#1e88e5', 'linewidth': 1.2, 'label': 'Rivers'})
        elif 'aquifer' in layer_name:
            style.update({'facecolor': '#ffcc00', 'edgecolor': '#ff9900', 'alpha': 0.5, 'label': 'Aquifer'})
        elif 'groundwater' in layer_name:
            style.update({'facecolor': '#a5d6a7', 'edgecolor': '#4caf50', 'alpha': 0.5, 'label': 'Groundwater Zones'})
        elif 'region' in layer_name or 'study' in layer_name:
             style.update({'edgecolor': '#e91e63', 'linewidth': 2.0, 'facecolor': 'none', 'label': 'Study Area'})
        elif 'district' in layer_name:
            style.update({'edgecolor': '#000000', 'linewidth': 1.0, 'facecolor': 'none', 'label': 'District Boundary'})
        elif 'state' in layer_name:
            style.update({'edgecolor': '#000000', 'linewidth': 2.0, 'facecolor': 'none', 'label': 'State Boundary'})
        elif 'micro' in layer_name:
             style.update({'facecolor': '#d1c4e9', 'edgecolor': '#673ab7', 'alpha': 0.4, 'label': 'Micro Watershed'})
            
        return style

    def add_north_arrow(self, ax):
        """Add a custom North Arrow to top-left (Simple Bold Style)"""
        x, y, w, h = ax.get_position().bounds
        
        # Position: Top Left
        arrow_x = 0.05
        arrow_y = 0.90
        
        # 'N' Label
        ax.text(arrow_x, arrow_y + 0.05, 'N', transform=ax.transAxes, 
                ha='center', va='bottom', fontsize=20, fontweight='bold', zorder=100)
        
        # Draw Arrow (Simple Triangle with concave base)
        # Vertices relative to arrow_x, arrow_y
        # Top tip: (0, 0.04)
        # Left corner: (-0.025, -0.02)
        # Right corner: (0.025, -0.02)
        # Bottom recess: (0, -0.01)
        
        path_x = [arrow_x, arrow_x - 0.025, arrow_x, arrow_x + 0.025]
        path_y = [arrow_y + 0.04, arrow_y - 0.03, arrow_y - 0.01, arrow_y - 0.03]
        
        # Draw Polygon
        # We need to transform these relative coordinates to display or data coordinates?
        # ax.fill works with data coords. transform=ax.transAxes makes it easy.
        
        # Using mpatches.Polygon
        verts = list(zip(path_x, path_y))
        poly = mpatches.Polygon(verts, closed=True, facecolor='black', edgecolor='black', transform=ax.transAxes, zorder=100)
        ax.add_patch(poly)


    def add_scale_bar(self, ax, bbox_3857):
        """Add a scale bar to bottom-center with alternating blocks"""
        minx, miny, maxx, maxy = bbox_3857.total_bounds
        width_m = maxx - minx
        
        # Target scale bar width approx 20%
        target_width_m = width_m * 0.2
        magnitude = 10 ** math.floor(math.log10(target_width_m))
        residual = target_width_m / magnitude
        if residual > 5:
            scale_width_m = 5 * magnitude
        elif residual > 2:
            scale_width_m = 2 * magnitude
        else:
            scale_width_m = 1 * magnitude
            
        scale_width_km = scale_width_m / 1000.0
        label = f"{int(scale_width_km)} km" if scale_width_km >= 1 else f"{int(scale_width_m)} m"
        
        # Position: Bottom Center, offset up slightly
        center_x = (minx + maxx) / 2
        bar_y = miny + (maxy - miny) * 0.08 
        
        # Create alternating blocks
        # 4 blocks: Black, White, Black, White
        block_width = scale_width_m / 4
        height = (maxy - miny) * 0.015
        
        start_x = center_x - scale_width_m/2
        
        # Block 1 (Black)
        rect1 = mpatches.Rectangle((start_x, bar_y), block_width, height, facecolor='black', edgecolor='black', zorder=100)
        ax.add_patch(rect1)
        
        # Block 2 (White)
        rect2 = mpatches.Rectangle((start_x + block_width, bar_y), block_width, height, facecolor='white', edgecolor='black', zorder=100)
        ax.add_patch(rect2)
        
        # Block 3 (Black)
        rect3 = mpatches.Rectangle((start_x + 2*block_width, bar_y), block_width, height, facecolor='black', edgecolor='black', zorder=100)
        ax.add_patch(rect3)
        
        # Block 4 (White)
        rect4 = mpatches.Rectangle((start_x + 3*block_width, bar_y), block_width, height, facecolor='white', edgecolor='black', zorder=100)
        ax.add_patch(rect4)
        
        # Label above
        ax.text(center_x, bar_y + height * 1.5, label, ha='center', va='bottom', fontsize=10, fontweight='bold', zorder=100)
        
        # Add ticks labels
        ax.text(start_x, bar_y - height * 0.5, "0", ha='center', va='top', fontsize=8, zorder=100)
        ax.text(start_x + scale_width_m, bar_y - height * 0.5, f"{int(scale_width_km)}", ha='center', va='top', fontsize=8, zorder=100)


    def add_legend(self, ax, used_layers):
        """Add legend to bottom-right with nicer styling"""
        handles = []
        # Custom logic for thematic layers so we don't show generic boxes
        thematic_present = {
            'gw': 'groundwater_zones' in used_layers,
            'rf': 'rainfall' in used_layers,
            'aq': 'aquifer' in used_layers
        }
        
        # Standard layers (Rivers, State, District, Canals, etc.)
        for layer in used_layers:
            if layer in ['groundwater_zones', 'rainfall', 'aquifer']:
                continue
                
            style = self._get_style(layer)
            label = style.get('label', layer)
            
            p = mpatches.Patch(
                facecolor=style.get('facecolor', 'none'),
                edgecolor=style.get('edgecolor', 'black'),
                alpha=style.get('alpha', 1),
                linewidth=style.get('linewidth', 1),
                label=label
            )
            handles.append(p)
        
        # Thematic Legends
        if thematic_present['gw']:
            handles.append(mpatches.Patch(visible=False, label="Groundwater Status:"))
            handles.append(mpatches.Patch(facecolor='#28a745', label='Safe', edgecolor='#555'))
            handles.append(mpatches.Patch(facecolor='#ffc107', label='Semi Critical', edgecolor='#555'))
            handles.append(mpatches.Patch(facecolor='#fd7e14', label='Critical', edgecolor='#555'))
            handles.append(mpatches.Patch(facecolor='#dc3545', label='Over Exploited', edgecolor='#555'))
            handles.append(mpatches.Patch(facecolor='#6c757d', label='Saline', edgecolor='#555'))

        if thematic_present['rf']:
            handles.append(mpatches.Patch(visible=False, label="Rainfall Intensity:"))
            # Show a spread of the blue palette
            handles.append(mpatches.Patch(facecolor=BLUE_PALETTE[0], label='Low', edgecolor='#555'))
            handles.append(mpatches.Patch(facecolor=BLUE_PALETTE[4], label='Medium', edgecolor='#555'))
            handles.append(mpatches.Patch(facecolor=BLUE_PALETTE[9], label='High', edgecolor='#555'))
        
        if thematic_present['aq']:
             handles.append(mpatches.Patch(visible=False, label="Aquifer Type (Common):"))
             handles.append(mpatches.Patch(facecolor='#f9eb0f', label='Younger Alluvium', edgecolor='#555')) # Younger Alluvium
             handles.append(mpatches.Patch(facecolor='#4caf50', label='Alluvium', edgecolor='#555')) # Alluvium
             handles.append(mpatches.Patch(facecolor='#f3722c', label='Sandstone', edgecolor='#555')) # Sandstone
             handles.append(mpatches.Patch(facecolor='#77dd77', label='Basalt', edgecolor='#555')) # Basalt

            
        if handles:
            leg = ax.legend(handles=handles, loc='lower right', frameon=True, 
                      fontsize=8, edgecolor='black', fancybox=False, framealpha=1, borderpad=0.8)
            leg.get_frame().set_linewidth(1.5)

    def render(self, bbox, layers, output_file, title="Map of Study Area", custom_styles=None, filters=None):
        """
        bbox: [minx, miny, maxx, maxy] in lat/lng (EPSG:4326)
        layers: list of layer names
        output_file: path to save PDF
        custom_styles: optional dict of style overrides per layer
        filters: optional dict for filtering/clipping (e.g. {'district': 'Ajmer'})
        """
        # Clean title
        title = title.replace('_', ' ')
        
        fig, ax = plt.subplots(figsize=(self.width, self.height))
        
        TARGET_CRS = "EPSG:3857"
        
        # 0. Determine Bounds (Check for District Filter first)
        clip_mask = None
        district_name = filters.get('district') if filters else None
        
        # Initialize default from input
        bbox_geom_input = box(bbox[0], bbox[1], bbox[2], bbox[3])
        bbox_gdf_input = gpd.GeoDataFrame({'geometry': [bbox_geom_input]}, crs="EPSG:4326")
        target_bounds = bbox_gdf_input.to_crs(TARGET_CRS).total_bounds # [minx, miny, maxx, maxy]

        if district_name:
            try:
                # Load district boundary to find the geometry
                dist_filename = LAYER_MAPPING.get('district')
                dist_path = os.path.join(GEOJSON_PATH, dist_filename)
                if os.path.exists(dist_path):
                    dist_gdf = gpd.read_file(dist_path)
                    # Normalize for comparison
                    col_name = next((c for c in dist_gdf.columns if c.lower() in ['district', 'new_dist', 'name']), None)
                    if col_name:
                         # Filter
                         target_dist = dist_gdf[dist_gdf[col_name].astype(str).str.lower() == str(district_name).lower()]
                         if not target_dist.empty:
                             # Re-project to target CRS
                             if target_dist.crs != TARGET_CRS:
                                 target_dist = target_dist.to_crs(TARGET_CRS)
                             
                             # Set Clip Mask
                             clip_mask = target_dist.geometry.unary_union
                             
                             # OVERRIDE BOUNDS with District Bounds
                             target_bounds = target_dist.total_bounds
                             
            except Exception as e:
                print(f"Error preparing clip mask/bounds: {e}")

        # 1. Aspect Ratio Correction (Fill the Page)
        # Calculate target aspect ratio from print dimensions
        target_aspect = self.width / self.height
        
        # Current bounds
        minx, miny, maxx, maxy = target_bounds
        input_width = maxx - minx
        input_height = maxy - miny
        input_aspect = input_width / input_height
        
        center_x = (minx + maxx) / 2
        center_y = (miny + maxy) / 2
        
        if input_aspect > target_aspect:
            # Too wide, increase height
            new_height = input_width / target_aspect
            new_miny = center_y - new_height / 2
            new_maxy = center_y + new_height / 2
            # Bbox is now [minx, new_miny, maxx, new_maxy]
            expanded_bounds = [minx, new_miny, maxx, new_maxy]
        else:
            # Too tall, increase width
            new_width = input_height * target_aspect
            new_minx = center_x - new_width / 2
            new_maxx = center_x + new_width / 2
            expanded_bounds = [new_minx, miny, new_maxx, maxy]
            
        # Final Plot Setup
        ax.set_xlim(expanded_bounds[0], expanded_bounds[2])
        ax.set_ylim(expanded_bounds[1], expanded_bounds[3])
        ax.set_aspect('equal')
        
        # Update bounds for Scale Bar calculation logic later
        # Create a fake gdf just to pass the "bbox_3857" object if needed, or just use tuple
        # The add_scale_bar function expects a bbox object with .total_bounds or we can pass bounds directly
        # Let's fix add_scale_bar call later to pass bounds, or recreate the object it expects
        # Re-creating bbox_3857 object for compatibility with existing add_scale_bar signature
        bbox_geom_final = box(expanded_bounds[0], expanded_bounds[1], expanded_bounds[2], expanded_bounds[3])
        bbox_gdf_final = gpd.GeoDataFrame({'geometry': [bbox_geom_final]}, crs=TARGET_CRS)
        bbox_3857 = bbox_gdf_final # This object matches the local var name used later

        # Render Layers

        # Render Layers
        used_layers = []
        # Sort keys to ensure boundaries are on top if needed, or stick to input order
        # Usually polygon fills first, then lines
        
        # Categorize
        fill_layers = []
        line_layers = []
        
        for layer_name in layers:
            if 'district' in layer_name or 'state' in layer_name or 'river' in layer_name or 'canal' in layer_name:
                line_layers.append(layer_name)
            else:
                fill_layers.append(layer_name)
                
        # Draw fills first
        draw_order = fill_layers + line_layers
        
        for layer_name in draw_order:
            if layer_name == 'rainfall':
                # Thematic Coloring for Rainfall (Blue Palette)
                # Switch to using SQLite DB source
                try:
                    import sqlite3
                    db_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')
                    
                    if not os.path.exists(db_path):
                        print(f"Database not found at {db_path}")
                        continue

                    # Connect to DB and fetch aggregated data
                    rain_data = []
                    try:
                        conn = sqlite3.connect(db_path)
                        cursor = conn.cursor()
                        
                        # Join: Rainfall -> Village -> GramPanchayat -> Block -> District
                        # We need Block Name, District Name, and Average Rainfall per block
                        query = """
                            SELECT 
                                lb.name as block_name,
                                ld.name as district_name,
                                AVG(rr.rainfall_mm) as avg_rainfall
                            FROM rainfallApi_rainfall rr
                            JOIN locationApi_village lv ON rr.village_id = lv.id
                            JOIN locationApi_grampanchayat lg ON lv.grampanchayat_id = lg.id
                            JOIN locationApi_block lb ON lg.block_id = lb.id
                            JOIN locationApi_district ld ON lb.district_id = ld.id
                            GROUP BY lb.id
                        """
                        
                        cursor.execute(query)
                        rows = cursor.fetchall()
                        
                        # Convert to list of dicts to match previous structure
                        for row in rows:
                            rain_data.append({
                                'block': row[0],
                                'district': row[1],
                                'rainfall_mm': row[2]
                            })
                            
                        conn.close()
                        print(f"DEBUG: Rainfall SQL returned {len(rain_data)} records.")
                        if len(rain_data) > 0:
                            print(f"DEBUG: Sample Rainfall Data: {rain_data[0]}")

                    except Exception as e:
                        print(f"SQL Error: {e}")
                        continue

                    if not rain_data:
                        print("No rainfall data found in database")
                        # Continue to plot outlines at least
                    
                    # 2. Aggregate Rainfall by Block
                    block_stats = {}
                    for item in rain_data:
                        # Normalize: Strip and UPPERCASE
                        b_name = str(item.get('block', '')).strip().upper()
                        d_name = str(item.get('district', '')).strip().upper()
                        
                        # Skip if block is missing
                        if not b_name: continue
                        
                        # Use tuple key for lookup
                        key = (d_name, b_name)
                        
                        # Handle numbers
                        val = float(item.get('rainfall_mm', 0) or 0)
                        block_stats[key] = {'total': val, 'count': 1}
                    
                    print(f"DEBUG: Block Stats Keys Sample: {list(block_stats.keys())[:5]}")

                    # 3. Load Block Boundaries for geometry
                    block_filename = LAYER_MAPPING.get('block')
                    # Ensure we look in the same base path
                    block_path = os.path.join(GEOJSON_PATH, block_filename)
                    
                    if not os.path.exists(block_path):
                        print(f"Block boundary file not found: {block_path}")
                        continue
                        
                    block_gdf = gpd.read_file(block_path)
                    if block_gdf.crs != TARGET_CRS:
                        block_gdf = block_gdf.to_crs(TARGET_CRS)
                        
                    # Apply Clipping if needed (e.g. District Filter)
                    if clip_mask is not None:
                        try:
                            block_gdf = gpd.clip(block_gdf, clip_mask)
                        except: pass

                    # 4. Join Data to Geometry
                    colors = []
                    vals = []
                    
                    # Pre-calculate averages for determining min/max
                    # We iterate twice: once to get range, once to assign colors
                    temp_vals = []
                    
                    for idx, row in block_gdf.iterrows():
                        # Normalize names from GeoDataFrame
                        # Try common property names found in block_boundary_updated.json
                        b_prop = row.get('BLOCK_NAME', row.get('Block', row.get('block', '')))
                        d_prop = row.get('DIST_NAME', row.get('District', row.get('district', '')))
                        
                        b_key = str(b_prop).strip().upper()
                        d_key = str(d_prop).strip().upper()
                        key = (d_key, b_key)
                        
                        avg_val = 0.0
                        # Exact match attempt
                        if key in block_stats:
                            stats = block_stats[key]
                            avg_val = stats['total'] / max(1, stats['count'])
                        else:
                            # Fallback: Try matching just Block Name
                            found = False
                            for k_stats, v_stats in block_stats.items():
                                if k_stats[1] == b_key: 
                                    avg_val = v_stats['total'] / max(1, v_stats['count'])
                                    found = True
                                    break
                            if not found:
                                avg_val = 0.0

                        temp_vals.append(avg_val)
                    
                    # Determine Range for coloring
                    non_zero_vals = [v for v in temp_vals if v > 0]
                    min_val = min(non_zero_vals) if non_zero_vals else 0
                    max_val = max(temp_vals) if temp_vals else 0
                    rng = max_val - min_val
                    
                    print(f"DEBUG: Rainfall Range: Min={min_val}, Max={max_val}, Rng={rng}")

                    # Assign Colors
                    for val in temp_vals:
                        if val == 0:
                            # Use a very light blue for 0 instead of nothing? 
                            # Let's use index 0 explicitly.
                            idx_color = 0
                        elif rng <= 0.001: 
                                idx_color = 0 
                        else:
                                # Linear interpolation
                                idx_color = int(((val - min_val) / rng) * (len(BLUE_PALETTE) - 1))
                        
                        c_idx = max(0, min(idx_color, len(BLUE_PALETTE)-1))
                        colors.append(BLUE_PALETTE[c_idx])

                    # 5. Plot
                    # Use a light edgecolor to distinguish blocks
                    block_gdf.plot(ax=ax, color=colors, edgecolor='#999999', linewidth=0.3, alpha=0.9)
                    if layer_name not in used_layers: used_layers.append(layer_name)
                    
                except Exception as e:
                    print(f"Error processing rainfall layer: {e}")
                
                # Continue loop to next layer since we handled rainfall completely
                continue

            filename = LAYER_MAPPING.get(layer_name)
            if not filename: filename = f"{layer_name}.geojson"
            
            filepath = os.path.join(GEOJSON_PATH, filename)
            
            if os.path.exists(filepath):
                try:
                    gdf = gpd.read_file(filepath)
                    if gdf.crs != TARGET_CRS:
                        gdf = gdf.to_crs(TARGET_CRS)
                    
                    # Apply Clipping
                    if clip_mask is not None:
                         # Don't feature-clip the boundary itself if checking "is this district"
                         # But usually we DO want to clip everything to the mask
                         # Use gpd.clip
                         try:
                             gdf = gpd.clip(gdf, clip_mask)
                         except Exception as clip_err:
                             print(f"Clipping failed for {layer_name}: {clip_err}")

                    if gdf.empty: continue

                    if layer_name == 'groundwater_zones':
                        # Thematic Coloring for Groundwater Zones
                        # Logic matches frontend useLegend.js
                        colors = []
                        for idx, row in gdf.iterrows():
                            # Get GWDL or similar property
                            val = row.get('GWDL', row.get('Category', ''))
                            status = str(val).strip().lower()
                            
                            color = '#3388ff' # Default
                            
                            if 'safe' in status: color = '#28a745'
                            elif 'semi' in status: color = '#ffc107'
                            elif 'critical' in status: color = '#fd7e14'
                            elif 'over' in status: color = '#dc3545'
                            elif 'saline' in status: color = '#6c757d'
                            
                            colors.append(color)
                        
                        # Plot
                        gdf.plot(ax=ax, color=colors, edgecolor='#555555', linewidth=0.5, alpha=0.6)
                        if layer_name not in used_layers: used_layers.append(layer_name)
                        continue 

                    if layer_name == 'aquifer':
                        # Thematic Coloring for Aquifer
                        colors = []
                        for idx, row in gdf.iterrows():
                            # Fix: Check 'Aquifer' (Capitalized) and other variants
                            # Get value and normalize
                            aq_raw = row.get('Aquifer', row.get('AQ_NAME', row.get('aquifer', row.get('aquifer_type', ''))))
                            aq_name = str(aq_raw).strip()
                            
                            # Default color
                            color = '#cccccc' 
                            
                            # Try to match key case-insensitive
                            for k, v in AQUIFER_COLORS.items():
                                if k.lower() == aq_name.lower():
                                    color = v
                                    break
                            colors.append(color)
                            
                        gdf.plot(ax=ax, color=colors, edgecolor='#555555', linewidth=0.2, alpha=0.6)
                        if layer_name not in used_layers: used_layers.append(layer_name)
                        continue

                    style = self._get_style(layer_name)
                    
                    # Apply custom overrides if present
                    if custom_styles and layer_name in custom_styles:
                         style.update(custom_styles[layer_name])

                    plot_style = {k:v for k,v in style.items() if k != 'label'}
                    
                    gdf.plot(ax=ax, **plot_style)
                    if layer_name not in used_layers: used_layers.append(layer_name)
                except Exception as e:
                    print(f"Error rendering {layer_name}: {e}")

        # Add Map Elements
        self.add_north_arrow(ax)
        self.add_scale_bar(ax, bbox_3857)
        self.add_legend(ax, used_layers)
        
        # Frame
        for spine in ax.spines.values():
            spine.set_linewidth(2)
            spine.set_color('black')
        
        # Grid/Coordinates
        # Manual Tick Formatting for Lat/Lon on 3857 axis
        # We need to map meters back to degrees
        def meters_to_latlon(x, y):
             # inverse mercator (simplified)
             lon = (x / 20037508.34) * 180
             lat = (y / 20037508.34) * 180
             lat = 180/math.pi * (2 * math.atan(math.exp(lat * math.pi / 180)) - math.pi / 2)
             return lat, lon

        # Generate simplified ticks
        # Get extent
        
        # Create custom ticks
        xticks_locs = ax.get_xticks()
        yticks_locs = ax.get_yticks()
        
        # Filter to visible
        xticks_locs = [t for t in xticks_locs if minx <= t <= maxx]
        yticks_locs = [t for t in yticks_locs if miny <= t <= maxy]
        
        # Reduce density if too many
        if len(xticks_locs) > 5: xticks_locs = xticks_locs[::2]
        if len(yticks_locs) > 5: yticks_locs = yticks_locs[::2]
        
        ax.set_xticks(xticks_locs)
        ax.set_yticks(yticks_locs)
        
        xtick_labels = []
        for x in xticks_locs:
             _, lon = meters_to_latlon(x, (miny+maxy)/2)
             xtick_labels.append(f"{lon:.1f}°E")
             
        ytick_labels = []
        for y in yticks_locs:
             lat, _ = meters_to_latlon((minx+maxx)/2, y)
             ytick_labels.append(f"{lat:.1f}°N")
             
        ax.set_xticklabels(xtick_labels, fontsize=10)
        ax.set_yticklabels(ytick_labels, fontsize=10, rotation=90, va='center')
        
        # Title below map
        plt.figtext(0.5, 0.02, title, ha='center', fontsize=16, fontweight='bold', fontname='Arial')
        
        plt.tight_layout(rect=[0.05, 0.05, 0.95, 0.95])
        plt.savefig(output_file, format='pdf', dpi=300, bbox_inches='tight')
        plt.close(fig)
        
        return output_file
