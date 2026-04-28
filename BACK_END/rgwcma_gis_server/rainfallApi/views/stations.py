from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Sum, Avg, Count, Q, Value, IntegerField
from django.core.cache import cache

from ..models import RainfallStation, StationRainfall
from ..serializers import RainfallStationSerializer, StationRainfallSerializer
from core.filters import HierarchicalLocationFilterBackend
from core.services.cache_utils import build_cache_key
from ..utils import calculate_rainfall_stats, calculate_rainfall_summary

class StationRainfallViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for daily station rainfall data with optimized performance.
    """
    queryset = StationRainfall.objects.all()
    serializer_class = StationRainfallSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = LimitOffsetPagination
    filter_backends = [HierarchicalLocationFilterBackend]
    
    location_filters = {
        'district': 'station__district__iexact',
        'station_district': 'station__district__iexact',
        'station_id': 'station_id',
        'station_name': 'station__name__iexact',
        'station_ids': 'station_id__in',
    }
    
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        
        # 1. Date Filtering
        if params.get('start_date'):
            queryset = queryset.filter(date__gte=params.get('start_date'))
        if params.get('end_date'):
            queryset = queryset.filter(date__lte=params.get('end_date'))

        # 2. Administrative Filtering (Spatially resolved fallback)
        # ONLY apply this if no explicit station IDs are provided, 
        # allowing the frontend to fall back to nearest stations if it chooses.
        district = params.get('district')
        district_id = params.get('district_id')
        block = params.get('block')
        block_id = params.get('block_id')
        gp = params.get('gram_panchayat') or params.get('grampanchayat') or params.get('gp')
        gp_id = params.get('gp_id')
        village = params.get('village')
        village_id = params.get('village_id')
        
        has_specific_station = params.get('station_id') or params.get('station_name') or params.get('station_ids')
        
        if (block or block_id or gp or gp_id or village or village_id) and not has_specific_station:
            from locationApi.models import Block, Grampanchayat, Village, District
            import logging
            logger = logging.getLogger(__name__)
            
            station_ids = []
            levels_tried = []
            
            try:
                # 1. Gather potential boundaries in order of specificity
                boundaries_to_check = []
                
                # Village Level
                if village_id:
                    v = Village.objects.filter(id=village_id).exclude(geometry__isnull=True).first()
                    if v: boundaries_to_check.append(('village', v))
                elif village:
                    vlg_q = Q(name__icontains=village.strip())
                    if gp: vlg_q &= Q(grampanchayat__name__icontains=gp.strip())
                    elif block: vlg_q &= Q(grampanchayat__block__name__icontains=block.strip())
                    v = Village.objects.filter(vlg_q).exclude(geometry__isnull=True).first()
                    if v: boundaries_to_check.append(('village', v))

                # GP Level
                if gp_id:
                    g = Grampanchayat.objects.filter(id=gp_id).exclude(geometry__isnull=True).first()
                    if g: boundaries_to_check.append(('gp', g))
                elif gp:
                    gp_q = Q(name__icontains=gp.strip())
                    if block: gp_q &= Q(block__name__icontains=block.strip())
                    g = Grampanchayat.objects.filter(gp_q).exclude(geometry__isnull=True).first()
                    if g: boundaries_to_check.append(('gp', g))

                # Block Level
                if block_id:
                    b = Block.objects.filter(id=block_id).exclude(geometry__isnull=True).first()
                    if b: boundaries_to_check.append(('block', b))
                elif block:
                    block_q = Q(name__icontains=block.strip())
                    if district: block_q &= Q(district__name__icontains=district.strip())
                    b = Block.objects.filter(block_q).exclude(geometry__isnull=True).first()
                    if b: boundaries_to_check.append(('block', b))

                # District Level
                if district:
                    d = District.objects.filter(name__icontains=district.strip()).exclude(geometry__isnull=True).first()
                    if d: boundaries_to_check.append(('district', d))

                # 2. Iterate through boundaries until stations are found
                for level_name, boundary in boundaries_to_check:
                    levels_tried.append(level_name)
                    ids = list(RainfallStation.objects.filter(
                        geometry__intersects=boundary.geometry
                    ).values_list('id', flat=True))
                    
                    if ids:
                        station_ids = ids
                        logger.info(f"Rainfall: Found {len(ids)} stations at '{level_name}' level for {boundary.name}")
                        break
                
                if station_ids:
                    queryset = queryset.filter(station_id__in=station_ids)
                    queryset._station_ids = station_ids
                    queryset._spatial_level = levels_tried[-1] if levels_tried else None
                else:
                    logger.warning(f"Rainfall: No stations found after checking levels: {levels_tried}")
                    queryset = queryset.none()
                    queryset._station_ids = []
            except Exception as e:
                logger.error(f"Spatial filtration failed: {e}", exc_info=True)
                queryset = queryset.none()
                queryset._station_ids = []


        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('station')
        return queryset

    @action(detail=False, methods=['get'])
    def stations(self, request):
        # Use the same filtering logic as records but return RainfallStation objects
        # We can extract the station_ids from our get_queryset logic
        queryset = self.filter_queryset(self.get_queryset())
        station_ids = getattr(queryset, '_station_ids', None)
        
        if station_ids is not None:
            stations = RainfallStation.objects.filter(id__in=station_ids)
        else:
            # Traditional property-based fallback if no spatial IDs
            stations = RainfallStation.objects.all()
            district = request.query_params.get('district')
            if district:
                stations = stations.filter(district__iexact=district)
                
        serializer = RainfallStationSerializer(stations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        cache_key = build_cache_key("station_rainfall_stats", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        # Clear ordering for faster aggregation
        queryset = self.filter_queryset(self.get_queryset()).order_by()
        station_ids = getattr(queryset, '_station_ids', None)
        unit_count = len(station_ids) if station_ids else None
        queryset = queryset.exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        result = calculate_rainfall_stats(queryset, is_station_data=True, unit_count=unit_count)
        result['station_ids'] = station_ids
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        timestep = request.query_params.get('timestep', 'daily').lower()
        cache_key = build_cache_key("station_rainfall_summary", request, extra=timestep)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        # Clear ordering for faster aggregation
        queryset = self.filter_queryset(self.get_queryset()).order_by()
        queryset = queryset.exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        result = calculate_rainfall_summary(queryset, timestep=timestep, is_station_data=True)
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def district_wise(self, request):
        cache_key = build_cache_key("station_rainfall_district_wise", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        data = queryset.values('station__district') \
                       .annotate(average_rainfall=Avg('rainfall_mm'), 
                                total_rainfall=Sum('rainfall_mm'),
                                record_count=Count('id')) \
                       .order_by('station__district')
        result = [
            {
                'district': d['station__district'],
                'average_rainfall': round(d['average_rainfall'] or 0, 2),
                'total_rainfall': round(d['total_rainfall'] or 0, 2),
                'record_count': d['record_count']
            }
            for d in data if d['station__district']
        ]
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def location_wise(self, request):
        level = request.query_params.get('level', 'district').lower()
        cache_key = build_cache_key("station_rainfall_location_wise", request, extra=level)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        queryset = self.filter_queryset(self.get_queryset()).exclude(rainfall_mm__isnull=True).filter(rainfall_mm__lt=10000)
        if level == 'district': group_field = 'station__district'
        elif level == 'station': group_field = 'station__name'
        else: return Response([])
        data = queryset.values(group_field).annotate(
            total_rainfall=Sum('rainfall_mm'),
            unit_count=Count('station_id', distinct=True)
        ).order_by(group_field)
        
        result = [
            {
                'location': d[group_field], 
                'average_rainfall': round((d['total_rainfall'] / d['unit_count']) if d['unit_count'] > 0 else 0, 2)
            } 
            for d in data if d[group_field]
        ]
        cache.set(cache_key, result, 3600)
        return Response(result)

    @action(detail=False, methods=['get'])
    def distribution(self, request):
        """
        Categorized distribution of rainfall (Excess, Normal, etc.) by location.
        """
        cache_key = build_cache_key("station_rainfall_distribution", request)
        cached_res = cache.get(cache_key)
        if cached_res: return Response(cached_res)
        
        queryset = self.filter_queryset(self.get_queryset())
        from ..utils import calculate_rainfall_distribution
        normal = request.query_params.get('normal')
        if normal:
            try: normal = float(normal)
            except: normal = None
            
        result = calculate_rainfall_distribution(queryset, normal_avg=normal, is_station_data=True)
        
        cache.set(cache_key, result, 3600)
        return Response(result)
