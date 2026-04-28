import os
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from shapely.wkb import loads as load_wkb
from shapely.geometry import box
from django.conf import settings
from django.contrib.gis.geos import Polygon as GEOSPolygon

# Local imports
from .geometry_utils import normalize_to_3857, meters_to_latlon, normalize_name
from .styles import get_style, GWRE_COLORS, AQUIFER_COLORS, LAYER_STYLES
from .layout import add_north_arrow, add_scale_bar, add_legend
from .data_service import fetch_layer_data, get_cached_gdf, GEOJSON_PATH, LAYER_MAPPING
from .thematic import plot_thematic_rainfall, plot_thematic_water_quality

class MapRenderer:
    def __init__(self, width_in=11.7, height_in=9.0):
        """Initialize with A4 Landscape dimensions or custom size."""
        self.width = width_in
        self.height = height_in
        self.target_crs = "EPSG:3857"
        
        # Tracking for legend
        self.active_thematic_items = {'gw': set(), 'aq': set()}
        self.wq_param_label = ''
        self.wq_buckets = []
        self.water_resource_layers = []
        self.custom_boundary_label = None

    def _resolve_scope(self, filters):
        """Determine study area geometry and bounding box."""
        from locationApi.models import District, Block, Grampanchayat, Village
        f = filters or {}
        clip_mask = None
        bounds_3857 = None
        target_obj = None

        dist_name = f.get('district')
        block_name = f.get('block')
        gp_name = f.get('gramPanchayat') or f.get('grampanchayat')
        village_name = f.get('village')

        if village_name:
            v_items = Village.objects.filter(name__iexact=village_name)
            if dist_name and dist_name.lower() != 'rajasthan':
                v_items = v_items.filter(grampanchayat__block__district__name__iexact=dist_name)
            if block_name:
                v_items = v_items.filter(grampanchayat__block__name__iexact=block_name)
            target_obj = v_items.first()
        elif gp_name:
            gp_items = Grampanchayat.objects.filter(name__iexact=gp_name)
            if dist_name and dist_name.lower() != 'rajasthan':
                gp_items = gp_items.filter(block__district__name__iexact=dist_name)
            if block_name:
                gp_items = gp_items.filter(block__name__iexact=block_name)
            target_obj = gp_items.first()
        elif block_name:
            if dist_name and dist_name.lower() != 'rajasthan':
                target_obj = Block.objects.filter(name__iexact=block_name, district__name__iexact=dist_name).first()
            if not target_obj:
                target_obj = Block.objects.filter(name__iexact=block_name).first()
        elif dist_name and dist_name.lower() != 'rajasthan':
            target_obj = District.objects.filter(name__iexact=dist_name).first()
        else:
            # RAJASTHAN Fallback: If no district is selected, use the union of all districts as mask
            from django.contrib.gis.db.models.aggregates import Union
            target_geom = District.objects.aggregate(all_geom=Union('geometry'))['all_geom']
            if target_geom:
                import geopandas as gpd
                gdf_target = normalize_to_3857(gpd.GeoDataFrame([{'geometry': load_wkb(bytes(target_geom.wkb))}]))
                clip_mask = gdf_target.geometry.unary_union
                bounds_3857 = gdf_target.total_bounds
                return clip_mask, bounds_3857

        if target_obj and target_obj.geometry:
            import geopandas as gpd
            gdf_target = normalize_to_3857(gpd.GeoDataFrame([{'geometry': load_wkb(bytes(target_obj.geometry.wkb))}]))
            clip_mask = gdf_target.geometry.unary_union
            bounds_3857 = gdf_target.total_bounds
        
        # Fallback to File if not found in DB
        if not target_obj and (village_name or gp_name or block_name or (dist_name and dist_name.lower() != 'rajasthan')):
            import geopandas as gpd
            search_name = village_name or gp_name or block_name or dist_name
            layer_key = 'village' if village_name else ('grampanchayat' if gp_name else ('block' if block_name else 'district'))
            
            temp_gdf = get_cached_gdf(layer_key)
            if temp_gdf is not None:
                match_col = 'DISTRICT' if layer_key == 'district' else 'name'
                match = temp_gdf[temp_gdf[match_col].astype(str).str.upper() == search_name.upper()]
                if not match.empty:
                    clip_mask = match.geometry.unary_union
                    bounds_3857 = match.total_bounds

        return clip_mask, bounds_3857

    def _add_labels(self, ax, gdf, label_col='name', fontsize=7):
        """Add non-overlapping labels to polygon centroids."""
        from matplotlib.patheffects import withStroke
        for _, row in gdf.iterrows():
            if row.geometry and not row.geometry.is_empty:
                name = str(row.get(label_col) or "").strip()
                if len(name) < 2: continue
                c = row.geometry.centroid
                if not (math.isfinite(c.x) and math.isfinite(c.y)): continue
                txt = ax.text(c.x, c.y, name, fontsize=fontsize, ha='center', va='center',
                            fontweight='bold', color='#1e293b', zorder=30)
                txt.set_path_effects([withStroke(linewidth=2, foreground='white', alpha=0.8)])

    def render(self, bbox, layers, output_file, title="Map", custom_styles=None, filters=None):
        """Optimized rendering pipeline."""
        # 0. Prep
        self.active_thematic_items = {'gw': set(), 'aq': set()}
        self.water_resource_layers = []
        f = filters or {}
        
        # 1. Setup Figure
        fig, ax = plt.subplots(figsize=(self.width, self.height))
        fig.patch.set_facecolor('#fdfdfd')
        
        # 2. Scope & Clipping
        clip_mask, bounds_3857 = self._resolve_scope(f)
        
        # Viewport Fallbacks
        if bounds_3857 is None or len(bounds_3857) != 4:
            import geopandas as gpd
            try:
                gdf_bbox = normalize_to_3857(gpd.GeoDataFrame({'geometry': [box(*bbox)]}))
                bounds_3857 = gdf_bbox.total_bounds
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Defaulting to Rajasthan bounds: {e}")
                bounds_3857 = [7700000, 2600000, 8750000, 3550000] # Rajasthan default

        minx, miny, maxx, maxy = bounds_3857
        pad_x, pad_y = (maxx - minx) * 0.05, (maxy - miny) * 0.05
        ax.set_xlim(minx - pad_x, maxx + pad_x)
        ax.set_ylim(miny - pad_y, maxy + pad_y)
        ax.set_aspect('equal')

        # 3. State Background
        from locationApi.models import State
        import geopandas as gpd
        state_gdf = fetch_layer_data('state', bbox)
        if state_gdf is not None and not state_gdf.empty:
            outline_gdf = state_gdf.copy()
            if clip_mask: state_gdf = gpd.clip(state_gdf, clip_mask)
            if not state_gdf.empty:
                state_gdf.plot(ax=ax, color='#f8fafc', zorder=0)
                outline_gdf.plot(ax=ax, facecolor='none', edgecolor='#0f172a', linewidth=2.0, zorder=10)

        # 4. Draw Layers
        plotted_layers = []
        ordered_layers = sorted(layers, key=lambda l: 0 if l in ['rainfall', 'water_quality', 'aquifer', 'groundwater_zones'] else 1)
        
        for layer in ordered_layers:
            if layer == 'rainfall':
                if plot_thematic_rainfall(ax, clip_mask, filters):
                    plotted_layers.append(layer)
                continue
            elif layer == 'water_quality':
                success, lbl, buck = plot_thematic_water_quality(ax, bounds_3857, clip_mask, filters)
                if success:
                    self.wq_param_label, self.wq_buckets = lbl, buck
                    plotted_layers.append(layer)
                continue

            gdf = fetch_layer_data(layer, bbox, filters, clip_mask)
            if gdf is None or gdf.empty: continue
            
            style = get_style(layer)
            
            if layer == 'groundwater_zones':
                colors = []
                for _, row in gdf.iterrows():
                    status = str(row.get('GWDL') or row.get('Category') or row.get('CATEGORY') or row.get('block_status') or row.get('Stage_of_G') or row.get('status') or '').lower()
                    color, label = GWRE_COLORS['default'], 'Default'
                    if 'safe' in status: color, label = GWRE_COLORS['safe'], 'Safe'
                    elif 'semi' in status: color, label = GWRE_COLORS['semi'], 'Semi Critical'
                    elif 'critical' in status: color, label = GWRE_COLORS['critical'], 'Critical'
                    elif 'over' in status: color, label = GWRE_COLORS['over'], 'Over Exploited'
                    elif 'saline' in status: color, label = GWRE_COLORS['saline'], 'Saline'
                    colors.append(color)
                    if label != 'Default': self.active_thematic_items['gw'].add(label)
                gdf.plot(ax=ax, color=colors, edgecolor='#1e293b', linewidth=0.3, alpha=0.85, zorder=2)
                plotted_layers.append(layer)
            
            elif layer == 'aquifer':
                colors = []
                for _, row in gdf.iterrows():
                    name = str(row.get('Aquifer') or "").strip()
                    self.active_thematic_items['aq'].add(name)
                    color = next((c for k, c in AQUIFER_COLORS.items() if k.lower() == name.lower()), '#cbd5e1')
                    colors.append(color)
                gdf.plot(ax=ax, color=colors, edgecolor='#1e293b', linewidth=0.2, alpha=0.85, zorder=2)
                plotted_layers.append(layer)
            
            else:
                plot_kwargs = {k:v for k,v in style.items() if k != 'label'}
                gdf.plot(ax=ax, **plot_kwargs)
                plotted_layers.append(layer)
                if layer in ('canals', 'waterbodies', 'micro', 'dams'):
                    self.water_resource_layers.append(layer)
                
                if layer in ['district', 'block', 'grampanchayat', 'village'] and len(gdf) < 60:
                    self._add_labels(ax, gdf, label_col='name', fontsize=8)

        # 5. Study Area Highlight
        if clip_mask:
            try:
                gdf_study = gpd.GeoDataFrame([{'geometry': clip_mask}], crs=self.target_crs)
                gdf_study.plot(ax=ax, facecolor='none', edgecolor='#e91e63', linewidth=2.5, zorder=15)
                # Labels
                lbl_map = {'village': 'Village', 'grampanchayat': 'GP', 'gramPanchayat': 'GP', 'block': 'Block', 'district': 'District'}
                scope_key = next((k for k in lbl_map if f.get(k)), 'Study Area')
                self.custom_boundary_label = f"{lbl_map.get(scope_key, 'Study Area')} Boundary"
                plotted_layers.append('study')
            except Exception:
                pass

        # 6. Final Layout
        add_north_arrow(ax)
        add_scale_bar(ax)
        
        add_legend(ax, plotted_layers, self.active_thematic_items, self.wq_param_label, self.wq_buckets, self.water_resource_layers, self.custom_boundary_label)
        
        # Grid/Frame
        for spine in ax.spines.values(): spine.set_edgecolor('#334155')
        try:
            xticks = np.linspace(ax.get_xlim()[0], ax.get_xlim()[1], 5)
            yticks = np.linspace(ax.get_ylim()[0], ax.get_ylim()[1], 6)
            ax.set_xticks(xticks)
            ax.set_yticks(yticks)
            cx, cy = np.mean(ax.get_xlim()), np.mean(ax.get_ylim())
            ax.set_xticklabels([f"{meters_to_latlon(x, cy)[1]:.2f}°E" for x in xticks], fontsize=8, color='#64748b')
            ax.set_yticklabels([f"{meters_to_latlon(cx, y)[0]:.2f}°N" for y in yticks], fontsize=8, color='#64748b')
            ax.grid(True, linestyle='--', alpha=0.3, zorder=1)
        except Exception:
            pass

        # Title
        region = f.get('village') or f.get('gramPanchayat') or f.get('grampanchayat') or f.get('block') or f.get('district') or "Rajasthan"
        plt.figtext(0.5, 0.96, title.upper(), ha='center', fontsize=20, fontweight='bold', color='#0f172a')
        plt.figtext(0.5, 0.93, f"Region: {region}", ha='center', fontsize=12, color='#475569')
        
        plt.subplots_adjust(left=0.08, right=0.95, top=0.92, bottom=0.35)
        plt.savefig(output_file, format='pdf', dpi=300, bbox_inches='tight')
        plt.close(fig)
        return output_file
