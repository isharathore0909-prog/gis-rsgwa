from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RainfallViewSet, StationRainfallViewSet

router = DefaultRouter()
router.register(r'records', RainfallViewSet)
router.register(r'station-records', StationRainfallViewSet)


urlpatterns = [
    path('', include(router.urls)),
]
