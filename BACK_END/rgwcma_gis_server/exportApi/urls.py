from django.urls import path
from .views import ExportMapView

urlpatterns = [
    path('map/', ExportMapView.as_view(), name='export-map'),
]
