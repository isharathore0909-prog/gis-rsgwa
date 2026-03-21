"""
Water Quality API Views

This module provides ViewSets for managing and querying water quality data
with support for location-based filtering and statistical analysis.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Max, Min, Count, Q, F
from django.core.cache import cache
import math
import re
import traceback

from .models import WaterQuality
from .serializers import WaterQualitySerializer, WaterQualityListSerializer
from .utils import calculate_wqi, check_quality_status, calculate_water_quality_stats

from core.filters import HierarchicalLocationFilterBackend, RangeFilterSet
from locationApi.models import Grampanchayat
from aquiferApi.models import AquiferData
from core.services.mapping import generate_contour_map, get_parameter_analysis, utm_to_latlon
from core.spatial_utils import get_map_scope

class WaterQualityViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for Water Quality records with optimized filtering and performance.
    """
    queryset = WaterQuality.objects.all()
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = ['type_of_well', 'meta_date', 'village']
    search_fields = ['well_id', 'village__name']
    ordering_fields = ['meta_date', 'ph', 'tds', 'well_id']
    ordering = ['-meta_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return WaterQualityListSerializer
        return WaterQualitySerializer

    def get_queryset(self):
        """
        Optimized with select_related ONLY for list/retrieve actions.
        """
        queryset = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related(
                'village__grampanchayat__block__district__state'
            )
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get comprehensive statistical summary of water quality parameters with caching.
        """
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"wq_stats_{'_'.join(loc_params) if loc_params else 'all'}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)

        queryset = self.filter_queryset(self.get_queryset())
        summary = calculate_water_quality_stats(queryset, WaterQuality)
        
        # Calculate WQI and Status based on aggregated averages
        wqi_data = calculate_wqi(summary)
        quality_status = check_quality_status(summary)
        
        # Well type distribution (separate query)
        well_types = queryset.values('type_of_well').annotate(
            count=Count('id')
        ).order_by('-count')
        
        res = {
            'summary': summary,
            'wqi': wqi_data,
            'status': quality_status,
            'well_type_distribution': list(well_types),
        }
        cache.set(cache_key, res, 3600)
        return Response(res)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """
        Get water quality data aggregated by location level with caching.
        """
        level = request.query_params.get('level', 'district')
        # Generate robust cache key from all relevant query params
        loc_params = [f"{k}={v}" for k, v in sorted(request.query_params.items()) if k not in ['page', 'format']]
        cache_key = f"wq_by_loc_{level}_{'_'.join(loc_params) if loc_params else 'all'}"
        
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
            
        queryset = self.filter_queryset(self.get_queryset())
        
        if level == 'district':
            data = queryset.values(
                'village__grampanchayat__block__district__name'
            ).annotate(
                count=Count('id'),
                avg_ph=Avg('ph'),
                avg_tds=Avg('tds'),
            ).order_by('-count')
            
            res = {
                'level': 'district',
                'data': list(data)
            }
            cache.set(cache_key, res, 3600)
            return Response(res)
        
        elif level == 'block':
            data = queryset.values(
                'village__grampanchayat__block__district__name',
                'village__grampanchayat__block__name'
            ).annotate(
                count=Count('id'),
                avg_ph=Avg('ph'),
                avg_tds=Avg('tds'),
            ).order_by('-count')
            
            res = {
                'level': 'block',
                'data': list(data)
            }
            cache.set(cache_key, res, 3600)
            return Response(res)
        
        return Response({
            'error': 'Invalid level parameter. Use "district" or "block".'
        }, status=status.HTTP_400_BAD_REQUEST)

class ContourMapView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            gp_id = request.query_params.get('gp_id')
            block_id = request.query_params.get('block_id')
            dist_id = request.query_params.get('district_id')
            parameter = request.query_params.get('parameter', 'pre_2024')
            
            if not any([gp_id, block_id, dist_id]):
                return Response({'error': 'A location ID (gp_id, block_id, or district_id) is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 1. Fetch Scope and Boundary
            boundary_data, coords, bbox_str, bbox_vals = get_map_scope(request, gp_id, block_id, dist_id)
            if not boundary_data:
                return Response({
                    'error': 'Map scope could not be determined',
                    'heatmap_url': None,
                    'analysis': {'buckets': [], 'unit': 'N/A', 'is_quality': False},
                    'well_count': 0
                }, status=status.HTTP_200_OK)
            
            min_x, min_y, max_x, max_y = bbox_vals
            
            # 2. Fetch Well Points 
            # (We use a slightly larger area than the display box 
            # to ensure interpolation is smooth at the edges)
            padding = (max_x - min_x) * 0.2
            search_min_x, search_max_x = min_x - padding, max_x + padding
            search_min_y, search_max_y = min_y - padding, max_y + padding

            p_lower = parameter.lower()
            is_decadal = p_lower in ['decadal_pre', 'decadal_pst']
            # Improved check: if it starts with pre_ or pst_, it's aquifer data. 
            # Otherwise, if it's not decadal, it's quality data.
            is_aquifer = is_decadal or p_lower.startswith('pre_') or p_lower.startswith('pst_')
            is_quality = not is_aquifer
            
            try:
                # Build a robust query:
                # 1. Spatial search (find neighbors for smooth contours)
                # 2. Block-based search (ensure we get all wells in the target area)
                
                spatial_query = Q(
                    latitude__range=(search_min_y, search_max_y),
                    longitude__range=(search_min_x, search_max_x)
                )
                
                # Hierarchical query
                loc_query = Q()
                if gp_id:
                    loc_query = Q(village__grampanchayat_id=gp_id)
                elif block_id:
                    loc_query = Q(village__grampanchayat__block_id=block_id)
                elif dist_id:
                    loc_query = Q(village__grampanchayat__block__district_id=dist_id)
                
                if is_decadal:
                    prefix = "pre" if "pre" in p_lower else "pst"
                    years = range(2015, 2025)
                    cols = [f"{prefix}_{y}" for y in years]
                    
                    raw_wells = AquiferData.objects.filter(spatial_query | loc_query).distinct()
                    
                    pts_data = []
                    for w in raw_wells:
                        vals = [getattr(w, c) for c in cols if getattr(w, c) is not None]
                        vals = [v for v in vals if not (isinstance(v, float) and (math.isnan(v) or math.isinf(v)))]
                        if vals:
                            avg_val = sum(vals) / len(vals)
                            pts_data.append({'lat': w.latitude, 'lon': w.longitude, 'val': avg_val})
                    raw_pts = pts_data
                elif is_quality:
                    raw_pts = WaterQuality.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(parameter))
                else:
                    raw_pts = AquiferData.objects.filter(spatial_query | loc_query).distinct().values('latitude', 'longitude', val=F(parameter))
            except Exception as fe:
                return Response({'error': f'Parameter "{parameter}" not available: {str(fe)}'}, status=status.HTTP_400_BAD_REQUEST)

            def extract_pts(source_pts):
                clean_pts = []
                for p in source_pts:
                    # Strict None checks to handle 0.0 correctly
                    lat = p.get('latitude') if p.get('latitude') is not None else p.get('lat')
                    lon = p.get('longitude') if p.get('longitude') is not None else p.get('lon')
                    val = p.get('val')
                    
                    if lat is None or lon is None or val is None: continue
                    
                    # Skip (0,0) placeholder coordinates which cause flat maps
                    if abs(float(lat)) < 0.001 and abs(float(lon)) < 0.001: 
                        continue
                        
                    if isinstance(val, (float, int)) and (math.isnan(val) or math.isinf(val)): continue
                    
                    # Detect and convert UTM (Rajasthan Northing is ~3M, Easting ~500k)
                    if lon > 200 or lat > 100: 
                        lon, lat = utm_to_latlon(lon, lat)
                        
                    clean_pts.append({'lat': lat, 'lon': lon, 'val': val})
                return clean_pts

            pts = extract_pts(raw_pts)

            # Fallback Logic: If no data found for the specific year, look back in time
            if not pts and is_aquifer and not is_decadal:
                try:
                    match = re.search(r'(\d{4})', parameter)
                    if match:
                        requested_year = int(match.group(1))
                        prefix = "pre_" if "pre" in parameter.lower() else "pst_"
                        for yr in range(requested_year - 1, max(2014, requested_year - 5), -1):
                            fallback_param = f"{prefix}{yr}"
                            subset = AquiferData.objects.filter(spatial_query | loc_query).distinct()
                            fallback_pts_raw = subset.values('latitude', 'longitude', val=F(fallback_param))
                            pts = extract_pts(fallback_pts_raw)
                            if pts:
                                parameter = fallback_param 
                                break
                except Exception as ex:
                    print(f"DEBUG: Fallback error: {ex}")
                    pass

            # 5. Determine Projection bounds early for bbox
            b_min_x, b_min_y, b_max_x, b_max_y = min_x, min_y, max_x, max_y
            
            width, height = 600, 500
            dx = b_max_x - b_min_x or 0.01
            dy = b_max_y - b_min_y or 0.01
            
            proj_bounds = {
                'minX': b_min_x - dx * 0.05,
                'maxX': b_max_x + dx * 0.05,
                'minY': b_min_y - dy * 0.05,
                'maxY': b_max_y + dy * 0.05
            }

            if not pts:
                return Response({
                    'message': 'No monitoring data with valid coordinates found for this area (2015-2024)',
                    'heatmap_url': "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", 
                    'analysis': get_parameter_analysis(parameter, []),
                    'well_count': 0,
                    'boundary': boundary_data,
                    'bbox': [proj_bounds['minX'], proj_bounds['minY'], proj_bounds['maxX'], proj_bounds['maxY']],
                    'contour_geojson': {'type': 'FeatureCollection', 'features': []}
                }, status=status.HTTP_200_OK)

            # 4. Calculate Analysis
            all_vals = [p['val'] for p in pts]
            analysis = get_parameter_analysis(parameter, all_vals)
            


            def project_pt(lon, lat, b):
                px = ((lon - b['minX']) / (b['maxX'] - b['minX'])) * width
                py = height - ((lat - b['minY']) / (b['maxY'] - b['minY'])) * height
                return px, py

            proj_pts = []
            for p in pts:
                px, py = project_pt(p['lon'], p['lat'], proj_bounds)
                proj_pts.append({'x': px, 'y': py, 'v': p['val']})

            # 6. Generate Map Image
            heatmap_url = generate_contour_map(
                proj_pts, proj_bounds, width, height, p=2.5, 
                buckets=analysis['buckets'], show_labels=True,
                boundary_geojson=boundary_data
            )

            return Response({
                'heatmap_url': heatmap_url,
                'analysis': analysis,
                'well_count': len(pts),
                'boundary': boundary_data,
                'bbox': [proj_bounds['minX'], proj_bounds['minY'], proj_bounds['maxX'], proj_bounds['maxY']],
                'contour_geojson': {'type': 'FeatureCollection', 'features': []}
            })

        except Exception as e:
            print(f"ERROR in ContourMapView: {str(e)}")
            print(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
