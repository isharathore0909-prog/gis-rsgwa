from rest_framework import viewsets, permissions
from .models import Rainfall
from .serializers import RainfallSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    The request is authenticated as a user, or is a read-only request.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class RainfallViewSet(viewsets.ModelViewSet):
    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        queryset = Rainfall.objects.all()
        village_id = self.request.query_params.get('village', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if village_id is not None:
            queryset = queryset.filter(village_id=village_id)
        
        if start_date is not None:
            queryset = queryset.filter(date__gte=start_date)
            
        if end_date is not None:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset
