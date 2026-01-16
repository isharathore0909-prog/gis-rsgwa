"""
URL configuration for rgwcma_gis_server project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def home(request):
    return JsonResponse({
        "status": "RGWCMA GIS Server running",
        "endpoints": {
            "location": "/api/location/",
            "account": "/api/account/",
            "rainfall": "/api/rainfall/",
            "raingauge": "/api/raingauge/",
            "water_quality": "/api/water-quality/",
            "aquifer": "/api/aquifer/",
            "recharge_structure": "/api/recharge-structure/"
        }
    })


urlpatterns = [
    path('', home),  # ✅ ROOT FIX

    path('admin/', admin.site.urls),

    path('api/location/', include('locationApi.urls')),
    path('api/account/', include('account_app.urls')),
    path('api/rainfall/', include('rainfallApi.urls')),
    path('api/raingauge/', include('raingaugeApi.urls')),

    path('api/', include('water_qualityApi.urls')),
    path('api/', include('aquiferApi.urls')),
    path('api/', include('rechargeStructureApi.urls')),
    path('api/export/', include('exportApi.urls')),
]
