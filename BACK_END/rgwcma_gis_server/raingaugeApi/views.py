from rest_framework import viewsets, permissions
from rest_framework.permissions import AllowAny
from .models import RainGauge
from .serializers import RainGaugeSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

from core.filters import HierarchicalLocationFilterBackend

class RainGaugeViewSet(viewsets.ModelViewSet):
    queryset = RainGauge.objects.all()
    serializer_class = RainGaugeSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [HierarchicalLocationFilterBackend]

    def get_queryset(self):
        """
        Location filtering now handled by HierarchicalLocationFilterBackend.
        """
        queryset = super().get_queryset()
        
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('village__grampanchayat__block__district')
            
        return queryset
