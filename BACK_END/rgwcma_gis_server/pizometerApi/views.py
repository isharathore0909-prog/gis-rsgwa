from rest_framework import viewsets, filters, permissions
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Piezometer
from .serializers import PiezometerSerializer

from core.filters import HierarchicalLocationFilterBackend

class PiezometerViewSet(viewsets.ModelViewSet):
    queryset = Piezometer.objects.all()
    serializer_class = PiezometerSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [
        DjangoFilterBackend, 
        HierarchicalLocationFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    filterset_fields = {
        'date': ['exact', 'gte', 'lte'],
    }
    search_fields = ['piezometer_name', 'village__name']
    ordering_fields = ['date', 'water_level_depth']
    ordering = ['-date']

    def get_queryset(self):
        """
        Location filtering now handled by HierarchicalLocationFilterBackend.
        """
        queryset = super().get_queryset()
        
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')
            
        return queryset
