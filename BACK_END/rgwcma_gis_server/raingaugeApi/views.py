from rest_framework import viewsets, permissions
from rest_framework.permissions import AllowAny
from .models import RainGauge
from .serializers import RainGaugeSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class RainGaugeViewSet(viewsets.ModelViewSet):
    queryset = RainGauge.objects.all()
    serializer_class = RainGaugeSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = RainGauge.objects.all()
        village_id = self.request.query_params.get('village', None)
        if village_id is not None:
            queryset = queryset.filter(village_id=village_id)
        
        # Additional hierarchical filters if needed
        district_id = self.request.query_params.get('district', None)
        if district_id is not None:
            queryset = queryset.filter(village__grampanchayat__block__district_id=district_id)
            
        return queryset
