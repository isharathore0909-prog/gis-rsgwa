from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, StateViewSet, DistrictViewSet, BlockViewSet, GPViewSet, VillageViewSet,
    PincodeView, BoundaryByCodeView, BoundaryCollectionView, LocationCodeView, 
    ExternalRequestProxyView, PointIdentifyView
)
from .views.external import GeoServerProxyView

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'states', StateViewSet)
router.register(r'districts', DistrictViewSet)
router.register(r'blocks', BlockViewSet)
router.register(r'gp', GPViewSet)
router.register(r'villages', VillageViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('pincode/', PincodeView.as_view(), name='pincode'),
    path('boundary-by-code/', BoundaryByCodeView.as_view(), name='boundary-by-code'),
    path('boundary-collection/', BoundaryCollectionView.as_view(), name='boundary-collection'),
    path('location-codes/', LocationCodeView.as_view(), name='location-codes'),
    path('external-proxy/<path:endpoint>/', ExternalRequestProxyView.as_view(), name='external-proxy'),
    path('geoserver-proxy/', GeoServerProxyView.as_view(), name='geoserver-proxy'),
    path('point-identify/', PointIdentifyView.as_view(), name='point-identify'),
]
