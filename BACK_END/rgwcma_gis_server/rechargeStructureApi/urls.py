from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RechargeStructureViewSet

router = DefaultRouter()
router.register(r'recharge-structure', RechargeStructureViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
