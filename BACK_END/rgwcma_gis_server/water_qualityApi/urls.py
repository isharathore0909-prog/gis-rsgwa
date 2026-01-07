from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WaterQualityViewSet

router = DefaultRouter()
router.register(r'water-quality', WaterQualityViewSet, basename='water-quality')

urlpatterns = [
    path('', include(router.urls)),
]
