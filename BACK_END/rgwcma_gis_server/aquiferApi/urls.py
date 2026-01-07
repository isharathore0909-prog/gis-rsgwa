from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AquiferDataViewSet

router = DefaultRouter()
router.register(r'aquifer', AquiferDataViewSet, basename='aquifer')

urlpatterns = [
    path('', include(router.urls)),
]
