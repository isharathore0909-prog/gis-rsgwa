from django.db.models import Count, Sum, Q, F, Case, When
from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import RechargeStructure
from .serializers import RechargeStructureSerializer
from locationApi.models import Village

class RechargeStructureViewSet(viewsets.ModelViewSet):
    queryset = RechargeStructure.objects.all()
    serializer_class = RechargeStructureSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['village', 'structure_type']
    search_fields = ['structure_type', 'other_recharge_structures', 'village__name']
    ordering_fields = ['storage_capacity', 'created_at']

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        # Basic counts for debugging
        total_available = RechargeStructure.objects.count()
        with_village = RechargeStructure.objects.filter(village__isnull=False).count()
        with_district = RechargeStructure.objects.filter(village__grampanchayat__block__district__isnull=False).count()
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Spelling correction for Dhaulpur/Dholpur mismatch
        district_param = request.query_params.get('district', '')
        if not queryset.exists() and ('dhaulpur' in district_param.lower() or 'dholpur' in district_param.lower()):
            # Try the other spelling
            alt_name = 'Dholpur' if 'dhaulpur' in district_param.lower() else 'Dhaulpur'
            queryset = RechargeStructure.objects.filter(
                village__grampanchayat__block__district__name__icontains=alt_name
            )
            
        # Group by structure_type but fallback to other_recharge_structures if generic
        # Use Case/When for conditional aggregation
        stats_queryset = queryset.annotate(
            display_type=Case(
                When(structure_type__in=['Other', 'Others', None], then=F('other_recharge_structures')),
                default=F('structure_type'),
            )
        ).values('display_type').annotate(
            count=Count('id'),
            total_capacity=Sum('storage_capacity')
        ).order_by('-count')

        filtered_count = queryset.count()
        
        summary = {
            'total_count': filtered_count,
            'total_available_in_db': total_available,
            'total_capacity': round(queryset.aggregate(Sum('storage_capacity'))['storage_capacity__sum'] or 0, 2),
            'by_type': [
                {
                    'type': (item['display_type'] or 'Unspecified').strip() or 'Other',
                    'count': item['count'],
                    'capacity': round(item['total_capacity'] or 0, 2)
                } for item in stats_queryset
            ],
            'debug': {
                'params': request.query_params,
                'with_village': with_village,
                'with_district': with_district,
                'filtered_count': filtered_count,
                'village_table_size': Village.objects.count(),
                'sample_rs_village_id': RechargeStructure.objects.first().village_id if RechargeStructure.objects.exists() else None
            }
        }
        
        return Response(summary)

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by state
        state = self.request.query_params.get('state', None)
        if state:
            queryset = queryset.filter(
                village__grampanchayat__block__district__state__name__icontains=state.strip()
            )
        
        # Filter by district
        district = self.request.query_params.get('district', None)
        if district:
            district_name = district.strip()
            # Common spelling variants
            variants = [district_name]
            if district_name.lower() == 'dhaulpur': variants.append('Dholpur')
            if district_name.lower() == 'dholpur': variants.append('Dhaulpur')
            if district_name.lower() == 'jaipur': variants.append('Jaipur (City)')
            
            q_obj = Q()
            for v in variants:
                q_obj |= Q(village__grampanchayat__block__district__name__icontains=v)
            queryset = queryset.filter(q_obj)
        
        # Filter by block
        block = self.request.query_params.get('block', None)
        if block:
            block_name = block.strip()
            queryset = queryset.filter(
                village__grampanchayat__block__name__icontains=block_name
            )

        # Filter by GP
        gp = self.request.query_params.get('gp_name', None)
        if gp:
            queryset = queryset.filter(
                village__grampanchayat__name__icontains=gp.strip()
            )

        # Filter by Village
        village = self.request.query_params.get('village_name', None)
        if village:
            queryset = queryset.filter(
                village__name__icontains=village.strip()
            )
            
        return queryset

