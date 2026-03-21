import geopandas as gpd
import math
import re

def meters_to_latlon(x, y):
    """Convert EPSG:3857 Web Mercator to EPSG:4326 Lat/Lon."""
    try:
        # Simple spherical mercator inverse projection
        lon = (x / 20037508.34) * 180
        lat = (y / 20037508.34) * 180
        lat = 180 / math.pi * (2 * math.atan(math.exp(lat * math.pi / 180)) - math.pi / 2)
        return lat, lon
    except:
        return 0.0, 0.0

def normalize_name(name):
    """Standardize names for matching (remove spaces, dots, special chars, case insensitive)."""
    if not name: return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(name)).lower()

def normalize_to_3857(gdf, target_crs="EPSG:3857"):
    """
    Unified pipeline to clean, detect CRS, and reproject to target_crs (3857).
    Prevents double-projection errors by detecting if coords are already in meters.
    """
    if gdf is None or gdf.empty:
        return gdf
    
    try:
        def fix_geom(g):
            if g is None: return None
            if not g.is_valid: return g.buffer(0)
            return g

        gdf.geometry = gdf.geometry.apply(fix_geom)
        
        # Detect current CRS or guess it
        if gdf.crs is None:
            # Guessing heuristic: if coords > 180, it's likely already in meters/UTM
            bounds = gdf.total_bounds
            if bounds[2] > 180 or bounds[3] > 90:
                # Likely UTM or Web Mercator. Check Rajasthan bounds for 3857 (7.7e6, 2.6e6)
                if bounds[0] > 1000000:
                    gdf.set_crs("EPSG:3857", inplace=True)
                else:
                    # Likely UTM (Rajasthan is mostly Zone 43N/44N)
                    gdf.set_crs("EPSG:32643", inplace=True)
            else:
                gdf.set_crs("EPSG:4326", inplace=True)
        
        if gdf.crs.to_string() != target_crs:
            gdf = gdf.to_crs(target_crs)
            
        return gdf
    except Exception as e:
        print(f"DEBUG: Normalization failed: {e}")
        return gdf
