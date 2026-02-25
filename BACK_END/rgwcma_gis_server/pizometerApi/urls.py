from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PiezometerViewSet

router = DefaultRouter()
router.register(r'piezometers', PiezometerViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
