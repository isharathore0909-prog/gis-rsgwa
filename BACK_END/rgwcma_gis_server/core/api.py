from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Import viewsets from all apps
from locationApi.views import (
    CountryViewSet, StateViewSet, DistrictViewSet, BlockViewSet, GPViewSet, VillageViewSet,
    PincodeView, BoundaryByCodeView, BoundaryCollectionView, LocationCodeView, 
    ExternalRequestProxyView, PointIdentifyView
)
from account_app.views import RegisterView
from rainfallApi.views import RainfallViewSet, StationRainfallViewSet
from raingaugeApi.views import RainGaugeViewSet
from water_qualityApi.views import WaterQualityViewSet
from waterquality_availabilityApi.views import WaterQualityAvailabilityViewSet
from aquiferApi.views import AquiferDataViewSet
from rechargeStructureApi.views import RechargeStructureViewSet
from pizometerApi.views import PiezometerViewSet
from layersApi.views import SpatialLayerViewSet

router = DefaultRouter()

# 1. Location Routes (Matching frontend /location/...)
router.register(r'location/countries', CountryViewSet)
router.register(r'location/states', StateViewSet)
router.register(r'location/districts', DistrictViewSet)
router.register(r'location/blocks', BlockViewSet)
router.register(r'location/gp', GPViewSet) # Frontend expects /location/gp/
router.register(r'location/villages', VillageViewSet)

# 2. Dataset Routes
# Rainfall (Frontend expects /rainfall/records/ and /rainfall/station-records/)
router.register(r'rainfall/records', RainfallViewSet, basename='rainfall-records')
router.register(r'rainfall/station-records', StationRainfallViewSet, basename='station-rainfall-records')
router.register(r'raingauge', RainGaugeViewSet)

# Piezometer (Frontend expects /piezometer/piezometers/)
router.register(r'piezometer/piezometers', PiezometerViewSet, basename='piezometer-records')

# Other Data
router.register(r'water-quality', WaterQualityViewSet)
router.register(r'water-quality-availability', WaterQualityAvailabilityViewSet)
router.register(r'aquifer', AquiferDataViewSet, basename='aquifer') # Frontend expects /aquifer/
router.register(r'recharge-structure', RechargeStructureViewSet)

# 3. Spatial Routes (Frontend expects /spatial/layers/)
router.register(r'spatial/layers', SpatialLayerViewSet)

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Auth URLs (Frontend expects /account/login/ etc.)
    path('account/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('account/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('account/register/', RegisterView.as_view(), name='register'),
    
    # Location Utility URLs
    path('location/pincode/', PincodeView.as_view(), name='pincode'),
    path('location/boundary-by-code/', BoundaryByCodeView.as_view(), name='boundary-by-code'),
    path('location/boundary-collection/', BoundaryCollectionView.as_view(), name='boundary-collection'),
    path('location/location-codes/', LocationCodeView.as_view(), name='location-codes'),
    path('location/external-proxy/<path:endpoint>/', ExternalRequestProxyView.as_view(), name='external-proxy'),
    path('location/point-identify/', PointIdentifyView.as_view(), name='point-identify'),
]
