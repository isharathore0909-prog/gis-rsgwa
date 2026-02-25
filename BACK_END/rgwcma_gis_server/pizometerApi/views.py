from rest_framework import viewsets, filters, permissions
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Piezometer
from .serializers import PiezometerSerializer

class PiezometerViewSet(viewsets.ModelViewSet):
    queryset = Piezometer.objects.all()
    serializer_class = PiezometerSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'date': ['exact', 'gte', 'lte'],
        'village__id': ['exact'],
        'village__name': ['exact', 'icontains'],
        'village__grampanchayat__name': ['exact', 'icontains'],
        'village__grampanchayat__block__id': ['exact'],
        'village__grampanchayat__block__name': ['exact', 'icontains'],
        'village__grampanchayat__block__district__id': ['exact'],
        'village__grampanchayat__block__district__name': ['exact', 'icontains'],
    }
    search_fields = ['piezometer_name', 'village__name']
    ordering_fields = ['date', 'water_level_depth']
    ordering = ['-date']
