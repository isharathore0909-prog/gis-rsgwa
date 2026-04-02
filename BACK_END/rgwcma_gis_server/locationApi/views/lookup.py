from django.db.models import QuerySet
from rest_framework import generics, permissions
from rest_framework.permissions import AllowAny
from ..models import LocationCode
from ..serializers import LocationHierarchySerializer

class LocationCodeView(generics.ListAPIView):
    queryset = LocationCode.objects.all().order_by('dist_name', 'block_name')
    serializer_class = LocationHierarchySerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get_queryset(self) -> QuerySet:
        qs = super().get_queryset()
        for p in ['dist_name', 'block_name', 'gp_name', 'vlg_name']:
            v = self.request.query_params.get(p)
            if v: qs = qs.filter(**{f"{p}__iexact": v})
        return qs
