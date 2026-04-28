import os
import numpy as np
from django.core.management.base import BaseCommand
from django.db import models
from scipy.ndimage import gaussian_filter
import matplotlib.pyplot as plt
from shapely.geometry import Polygon, MultiPolygon
from django.contrib.gis.geos import GEOSGeometry
from water_qualityApi.models import WaterQuality, WaterQualityContour
from core.services.mapping import get_parameter_analysis

def idw_interpolate(x_pts, y_pts, v_pts, grid_x, grid_y, p_pow=2.0):
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

def to_multipolygon(geos_geom):
    """Ensure GEOS geometry is a MultiPolygon."""
    from django.contrib.gis.geos import MultiPolygon, Polygon, GeometryCollection
    if geos_geom.geom_type == 'MultiPolygon':
        return geos_geom
    if geos_geom.geom_type == 'Polygon':
        return MultiPolygon(geos_geom)
    if geos_geom.geom_type == 'GeometryCollection':
        polys = [g for g in geos_geom if g.geom_type in ['Polygon', 'MultiPolygon']]
        if not polys: return None
        flat_polys = []
        for p in polys:
            if p.geom_type == 'Polygon':
                flat_polys.append(p)
            else:
                for sub_p in p:
                    flat_polys.append(sub_p)
        return MultiPolygon(*flat_polys)
    return None

class Command(BaseCommand):
    help = 'Precomputes water quality contours and saves them to the database.'

    def add_arguments(self, parser):
        parser.add_argument('parameters', nargs='*', default=['ec', 'tds', 'ph', 'nitrate', 'fluoride'], help='Parameters to process')
        parser.add_argument('--date', type=str, help='Meta date (YYYY-MM-DD) to process')

    def handle(self, *args, **options):
        parameters = options['parameters']
        meta_date = options['date']

        from locationApi.models import State, District
        rajasthan = State.objects.filter(name__icontains='Rajasthan').first()
        state_geom = None
        if rajasthan and rajasthan.geometry:
            state_geom = GEOSGeometry(rajasthan.geometry.wkt)
        else:
            from django.contrib.gis.db.models.aggregates import Union
            dist_union = District.objects.aggregate(all_geom=Union('geometry'))['all_geom']
            state_geom = dist_union

        for parameter in parameters:
            self.stdout.write(f"--- Processing {parameter} ---")
            
            qs = WaterQuality.objects.filter(**{f"{parameter}__isnull": False})
            if meta_date:
                qs = qs.filter(meta_date=meta_date)
            
            if not qs.exists():
                self.stdout.write(self.style.WARNING(f"  No data found for {parameter}."))
                continue

            pts = list(qs.values('latitude', 'longitude', val=models.F(parameter)))
            lats = np.array([p['latitude'] for p in pts])
            lons = np.array([p['longitude'] for p in pts])
            vals = np.array([p['val'] for p in pts])

            if state_geom:
                min_lon, min_lat, max_lon, max_lat = state_geom.extent
            else:
                min_lon, max_lon = lons.min(), lons.max()
                min_lat, max_lat = lats.min(), lats.max()
            
            padding = 0.05
            min_lon -= padding; max_lon += padding
            min_lat -= padding; max_lat += padding

            res = 250 
            grid_lon = np.linspace(min_lon, max_lon, res)
            grid_lat = np.linspace(min_lat, max_lat, res)
            X, Y = np.meshgrid(grid_lon, grid_lat)

            self.stdout.write(f"  Interpolating {len(pts)} points...")
            grid_raw = idw_interpolate(lons, lats, vals, X, Y)
            grid = gaussian_filter(grid_raw, sigma=1.5)

            analysis = get_parameter_analysis(parameter, vals)
            buckets = analysis['buckets']
            
            WaterQualityContour.objects.filter(parameter=parameter).delete()

            self.stdout.write(f"  Generating {len(buckets)} isobands...")
            for bucket in buckets:
                lev_min, lev_max = bucket['min'], bucket['max']
                plt.figure()
                cs = plt.contourf(X, Y, grid, levels=[lev_min, lev_max])
                
                polygons = []
                for path in cs.get_paths():
                    for coords in path.to_polygons():
                        if len(coords) < 3: continue
                        try:
                            poly = Polygon(coords)
                            if not poly.is_valid: poly = poly.buffer(0)
                            if not poly.is_empty: polygons.append(poly)
                        except Exception: pass
                plt.close()

                if polygons:
                    try:
                        from shapely.ops import unary_union
                        merged = unary_union(polygons)
                        if isinstance(merged, Polygon):
                            merged = MultiPolygon([merged])
                        
                        merged_geos = GEOSGeometry(merged.wkt)
                        if state_geom:
                            merged_geos = merged_geos.intersection(state_geom)
                        
                        if not merged_geos.empty:
                            final_geom = to_multipolygon(merged_geos)
                            if final_geom:
                                WaterQualityContour.objects.create(
                                    parameter=parameter,
                                    meta_date=meta_date or WaterQuality.objects.latest('meta_date').meta_date,
                                    min_value=lev_min,
                                    max_value=lev_max,
                                    label=bucket['label'],
                                    color=bucket['color'],
                                    geom=final_geom
                                )
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"  Error during union/save for {bucket['label']}: {e}"))

            self.stdout.write(self.style.SUCCESS(f"  Done with {parameter}."))
