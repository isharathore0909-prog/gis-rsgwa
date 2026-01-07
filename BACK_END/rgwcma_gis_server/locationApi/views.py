from rest_framework import viewsets, permissions
from .models import Country, State, District, Block, Grampanchayat, Village
from .serializers import (
    CountrySerializer, StateSerializer, DistrictSerializer, 
    BlockSerializer, GrampanchayatSerializer, VillageSerializer
)

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    The request is authenticated as a user, or is a read-only request.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [IsAdminOrReadOnly]

class StateViewSet(viewsets.ModelViewSet):
    queryset = State.objects.all()
    serializer_class = StateSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        queryset = State.objects.all()
        country_id = self.request.query_params.get('country', None)
        if country_id is not None:
            queryset = queryset.filter(country_id=country_id)
        return queryset

class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = District.objects.all()
        state_id = self.request.query_params.get('state', None)
        if state_id is not None:
            queryset = queryset.filter(state_id=state_id)
        return queryset

class BlockViewSet(viewsets.ModelViewSet):
    queryset = Block.objects.all()
    serializer_class = BlockSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Block.objects.all()
        district_id = self.request.query_params.get('district', None)
        if district_id is not None:
            queryset = queryset.filter(district_id=district_id)
        return queryset

class GrampanchayatViewSet(viewsets.ModelViewSet):
    queryset = Grampanchayat.objects.all()
    serializer_class = GrampanchayatSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Grampanchayat.objects.all()
        block_id = self.request.query_params.get('block', None)
        if block_id is not None:
            queryset = queryset.filter(block_id=block_id)
        return queryset

class VillageViewSet(viewsets.ModelViewSet):
    queryset = Village.objects.all()
    serializer_class = VillageSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Village.objects.all()
        grampanchayat_id = self.request.query_params.get('grampanchayat', None)
        if grampanchayat_id is not None:
            queryset = queryset.filter(grampanchayat_id=grampanchayat_id)
        
        # Backward compatibility or convenience: filter by block
        block_id = self.request.query_params.get('block', None)
        if block_id is not None:
            queryset = queryset.filter(grampanchayat__block_id=block_id)
            
        return queryset
