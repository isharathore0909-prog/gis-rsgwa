import math
import re
import traceback
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.db.models import Q, F

from ..models import WaterQuality
from aquiferApi.models import AquiferData
from core.services.mapping import generate_contour_map, get_parameter_analysis, utm_to_latlon
from core.spatial_utils import get_map_scope

class ContourMapView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            gp_id, block_id, dist_id = request.query_params.get('gp_id'), request.query_params.get('block_id'), request.query_params.get('district_id')
            parameter = request.query_params.get('parameter', 'pre_2024')
            if not any([gp_id, block_id, dist_id]):
                return Response({'error': 'A location ID (gp_id, block_id, or district_id) is required'}, status=status.HTTP_400_BAD_REQUEST)
            boundary_data, coords, bbox_str, bbox_vals = get_map_scope(request, gp_id, block_id, dist_id)
            if not boundary_data:
                return Response({'error': 'Map scope could not be determined', 'heatmap_url': None, 'analysis': {'buckets': [], 'unit': 'N/A', 'is_quality': False}, 'well_count': 0}, status=status.HTTP_200_OK)
            min_x, min_y, max_x, max_y = bbox_vals
            padding = (max_x - min_x) * 0.2
            search_min_x, search_max_x, search_min_y, search_max_y = min_x - padding, max_x + padding, min_y - padding, max_y + padding
            p_lower = parameter.lower()
            is_decadal = p_lower in ['decadal_pre', 'decadal_pst']
            is_aquifer = is_decadal or p_lower.startswith('pre_') or p_lower.startswith('pst_')
            is_quality = not is_aquifer
            spatial_query = Q(latitude__range=(search_min_y, search_max_y), longitude__range=(search_min_x, search_max_x))
            loc_query = Q()
            if gp_id: loc_query = Q(village__grampanchayat_id=gp_id)
            elif block_id: loc_query = Q(village__grampanchayat__block_id=block_id)
            elif dist_id: loc_query = Q(village__grampanchayat__block__district_id=dist_id)
            if is_decadal:
                prefix = "pre" if "pre" in p_lower else "pst"
                years, cols = range(2015, 2025), [f"{prefix}_{y}" for y in range(2015, 2025)]
                raw_wells = AquiferData.objects.filter(spatial_query | loc_query).distinct()
                pts_data = []
                for w in raw_wells:
                    vals = [getattr(w, c) for c in cols if getattr(w, c) is not None]
                    vals = [v for v in vals if not (isinstance(v, float) and (math.isnan(v) or math.isinf(v)))]
                    if vals: pts_data.append({'lat': w.latitude, 'lon': w.longitude, 'val': sum(vals) / len(vals)})
                raw_pts = pts_data
            elif is_quality:
                raw_pts = WaterQuality.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(parameter))
            else:
                raw_pts = AquiferData.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(parameter))
            def extract_pts(source_pts):
                clean_pts = []
                for p in source_pts:
                    lat, lon, val = p.get('latitude') if p.get('latitude') is not None else p.get('lat'), p.get('longitude') if p.get('longitude') is not None else p.get('lon'), p.get('val')
                    if lat is None or lon is None or val is None: continue
                    if abs(float(lat)) < 0.001 and abs(float(lon)) < 0.001: continue
                    if isinstance(val, (float, int)) and (math.isnan(val) or math.isinf(val)): continue
                    if lon > 200 or lat > 100: lon, lat = utm_to_latlon(lon, lat)
                    clean_pts.append({'lat': lat, 'lon': lon, 'val': val})
                return clean_pts
            pts = extract_pts(raw_pts)
            if not pts and is_aquifer and not is_decadal:
                try:
                    match = re.search(r'(\d{4})', parameter)
                    if match:
                        requested_year = int(match.group(1))
                        prefix = "pre_" if "pre" in parameter.lower() else "pst_"
                        for yr in range(requested_year - 1, max(2014, requested_year - 5), -1):
                            pts = extract_pts(AquiferData.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(f"{prefix}{yr}")))
                            if pts: parameter = f"{prefix}{yr}"; break
                except: pass
            width, height = 600, 500
            dx, dy = (max_x - min_x or 0.01), (max_y - min_y or 0.01)
            proj_bounds = {'minX': min_x - dx * 0.05, 'maxX': max_x + dx * 0.05, 'minY': min_y - dy * 0.05, 'maxY': max_y + dy * 0.05}
            if not pts:
                return Response({'message': 'No data found', 'heatmap_url': "data:image/png;base64,...", 'analysis': get_parameter_analysis(parameter, []), 'well_count': 0, 'boundary': boundary_data, 'bbox': [proj_bounds['minX'], proj_bounds['minY'], proj_bounds['maxX'], proj_bounds['maxY']], 'contour_geojson': {'type': 'FeatureCollection', 'features': []}}, status=status.HTTP_200_OK)
            analysis = get_parameter_analysis(parameter, [p['val'] for p in pts])
            proj_pts = [{'x': ((p['lon'] - proj_bounds['minX']) / (proj_bounds['maxX'] - proj_bounds['minX'])) * width, 'y': height - ((p['lat'] - proj_bounds['minY']) / (proj_bounds['maxY'] - proj_bounds['minY'])) * height, 'v': p['val']} for p in pts]
            heatmap_url = generate_contour_map(proj_pts, proj_bounds, width, height, p=2.5, buckets=analysis['buckets'], show_labels=True, boundary_geojson=boundary_data)
            return Response({'heatmap_url': heatmap_url, 'analysis': analysis, 'well_count': len(pts), 'boundary': boundary_data, 'bbox': [proj_bounds['minX'], proj_bounds['minY'], proj_bounds['maxX'], proj_bounds['maxY']], 'contour_geojson': {'type': 'FeatureCollection', 'features': []}})
        except Exception as e:
            print(f"ERROR: {str(e)}"); traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
