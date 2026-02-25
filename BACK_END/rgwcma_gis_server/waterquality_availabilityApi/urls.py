from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WaterQualityAvailabilityViewSet

router = DefaultRouter()
router.register(r'water-quality-availability', WaterQualityAvailabilityViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
