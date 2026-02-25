from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpatialLayerViewSet

router = DefaultRouter()
router.register(r'layers', SpatialLayerViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
