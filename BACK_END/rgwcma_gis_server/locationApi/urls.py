from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, StateViewSet, DistrictViewSet, 
    BlockViewSet, VillageViewSet
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'states', StateViewSet)
router.register(r'districts', DistrictViewSet)
router.register(r'blocks', BlockViewSet)
router.register(r'villages', VillageViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
