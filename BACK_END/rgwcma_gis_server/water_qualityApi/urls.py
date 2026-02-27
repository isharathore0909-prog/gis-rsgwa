from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WaterQualityViewSet, ContourMapView

router = DefaultRouter()
router.register(r'', WaterQualityViewSet, basename='water-quality')

urlpatterns = [
    path('contour-map/', ContourMapView.as_view(), name='contour-map'),
    path('', include(router.urls)),
]
