from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RainfallViewSet

router = DefaultRouter()
router.register(r'records', RainfallViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
