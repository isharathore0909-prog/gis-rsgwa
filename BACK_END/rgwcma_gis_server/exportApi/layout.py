import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import math
from .styles import GWRE_COLORS, AQUIFER_COLORS, BLUE_PALETTE

def add_north_arrow(ax):
    """Add a custom North Arrow to Top-Right."""
    arrow_x, arrow_y = 0.93, 0.90
    ax.text(arrow_x, arrow_y + 0.04, 'N', transform=ax.transAxes, 
            ha='center', va='bottom', fontsize=18, fontweight='bold', zorder=100)
    
    path_x = [arrow_x, arrow_x - 0.02, arrow_x, arrow_x + 0.02]
    path_y = [arrow_y + 0.03, arrow_y - 0.03, arrow_y - 0.01, arrow_y - 0.03]
    
    poly = mpatches.Polygon(list(zip(path_x, path_y)), closed=True, 
                            facecolor='black', edgecolor='black', transform=ax.transAxes, zorder=100)
    ax.add_patch(poly)

def add_scale_bar(ax):
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

def add_legend(ax, used_layers, active_thematic_items=None, wq_param_label='', wq_buckets=None, water_resource_layers=None, custom_boundary_label=None):
    """Add legend to bottom-center with horizontal layout."""
    if not used_layers: return
    
    handles = []
    ncol = 4
    
    def push_to_new_row(h_list, add_gap=False):
        current_len = len(h_list)
        needed = (ncol - (current_len % ncol)) % ncol
        for _ in range(needed):
            h_list.append(mpatches.Patch(visible=False, label=""))
        if add_gap:
            for _ in range(ncol):
                h_list.append(mpatches.Patch(visible=False, label=""))

    # 1. Study Area / Boundaries
    if 'study' in used_layers or any(l in used_layers for l in ['district', 'block', 'grampanchayat', 'village']):
        handles.append(mpatches.Patch(visible=False, label=r"$\bf{Boundaries:}$"))
        seen_labels = set()
        
        active_level = 5
        if 'study' in used_layers:
            lbl = custom_boundary_label or "Study Area Boundary"
            handles.append(mpatches.Patch(edgecolor='#e91e63', facecolor='none', linewidth=2, label=lbl))
            seen_labels.add(lbl)
            
            if custom_boundary_label:
                if 'Village' in custom_boundary_label: active_level = 1
                elif 'GP' in custom_boundary_label: active_level = 2
                elif 'Block' in custom_boundary_label: active_level = 3
                elif 'District' in custom_boundary_label: active_level = 4
        
        boundary_swatches = {
            'district': ('#64748b', 'District Boundary', 4),
            'block': ('#94a3b8', 'Block Boundary', 3),
            'grampanchayat': ('#cbd5e1', 'GP Boundary', 2),
            'village': ('#e2e8f0', 'Village Boundary', 1),
        }
        for l in ['district', 'block', 'grampanchayat', 'village']:
            if l in used_layers:
                col, lbl, lvl = boundary_swatches[l]
                if lvl < active_level and lbl not in seen_labels:
                    # Only show if it's a smaller internal subdivision bounded by the study area
                    handles.append(mpatches.Patch(edgecolor=col, facecolor='none', linewidth=1, label=lbl))
                    seen_labels.add(lbl)
        push_to_new_row(handles)

    # 2. Rainfall Thematic
    if 'rainfall' in used_layers:
        push_to_new_row(handles, add_gap=True)
        handles.append(mpatches.Patch(visible=False, label=r"$\bf{Rainfall\ (mm):}$"))
        ranges = [
            (BLUE_PALETTE[0], '0'), (BLUE_PALETTE[2], '0 - 2.5'),
            (BLUE_PALETTE[4], '2.5 - 7.6'), (BLUE_PALETTE[6], '7.6 - 15'),
            (BLUE_PALETTE[8], '15 - 35.6'), (BLUE_PALETTE[10], '35.6 - 64.5'),
            (BLUE_PALETTE[11], '> 64.5')
        ]
        for c, l in ranges:
            handles.append(mpatches.Patch(facecolor=c, label=l, edgecolor='#555'))
        push_to_new_row(handles)

    # 3. Groundwater Zones
    if 'groundwater_zones' in used_layers and active_thematic_items and active_thematic_items.get('gw'):
        push_to_new_row(handles, add_gap=True)
        handles.append(mpatches.Patch(visible=False, label=r"$\bf{GW\ Category:}$"))
        gw_map = {'Safe': 'safe', 'Semi Critical': 'semi', 'Critical': 'critical', 'Over Exploited': 'over', 'Saline': 'saline'}
        for lbl in ['Safe', 'Semi Critical', 'Critical', 'Over Exploited', 'Saline']:
            if lbl in active_thematic_items['gw']:
                handles.append(mpatches.Patch(facecolor=GWRE_COLORS[gw_map[lbl]], label=lbl, edgecolor='#555'))
        push_to_new_row(handles)

    # 4. Aquifers
    if 'aquifer' in used_layers and active_thematic_items and active_thematic_items.get('aq'):
        push_to_new_row(handles, add_gap=True)
        handles.append(mpatches.Patch(visible=False, label=r"$\bf{Aquifers:}$"))
        for name in sorted(list(active_thematic_items['aq'])):
            color = next((c for k, c in AQUIFER_COLORS.items() if k.lower() == name.lower()), '#cbd5e1')
            handles.append(mpatches.Patch(facecolor=color, label=name, edgecolor='#555'))
        push_to_new_row(handles)

    # 5. Water Quality
    if 'water_quality' in used_layers and wq_buckets:
        push_to_new_row(handles, add_gap=True)
        title_wq = f"Water Quality ({wq_param_label}):"
        handles.append(mpatches.Patch(visible=False, label=fr"$\bf{{{title_wq}}}$"))
        for bucket in wq_buckets:
            bucket_label = bucket.get('label')
            bucket_color = bucket.get('color', '#cccccc')
            if bucket_color.startswith('rgb'):
                try:
                    import ast
                    rgb_t = ast.literal_eval(bucket_color.replace('rgb', ''))
                    bucket_color = '#%02x%02x%02x' % rgb_t
                except: pass
            if bucket_label:
                handles.append(mpatches.Patch(facecolor=bucket_color, label=bucket_label, edgecolor='#555'))
        push_to_new_row(handles)

    # 6. Water Resources (Static Layers)
    if water_resource_layers:
        push_to_new_row(handles, add_gap=True)
        handles.append(mpatches.Patch(visible=False, label=r"$\bf{Water\ Resources:}$"))
        wr_swatches = {
            'canals':      ('#00bcd4', 'Canals'),
            'waterbodies': ('#3b82f6', 'Waterbodies'),
            'micro':       ('#8b5cf6', 'Micro Watershed'),
            'dams':        ('#0ea5e9', 'Dams'),
        }
        for lyr in water_resource_layers:
            if lyr in wr_swatches:
                col, lbl = wr_swatches[lyr]
                handles.append(mpatches.Patch(facecolor=col, label=lbl, edgecolor='#555'))
            
    if handles:
        fs = 8.5 if len(handles) > 15 else 9
        leg = ax.legend(handles=handles, loc='upper center', bbox_to_anchor=(0.5, -0.10),
                      frameon=True, fontsize=fs, edgecolor='#334155', fancybox=False, ncol=ncol, title='Legend')
        leg.get_frame().set_linewidth(1.2)
        leg.get_title().set(fontsize=11, fontweight='bold', ha='center')
