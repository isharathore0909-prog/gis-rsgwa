import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from .base import GPSPL_DOMAIN, DEFAULT_EXTERNAL_API_KEY
from ..authentication import ApiKeyAuthentication
from ..permissions import HasValidApiKey

class ExternalRequestProxyView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def handle_request(self, request, endpoint, method='GET'):
        url = f"{GPSPL_DOMAIN}/{endpoint}/"
        headers = {"X-Auth-Key": DEFAULT_EXTERNAL_API_KEY}
        try:
            if method == 'GET':
                 res = requests.get(url, params=request.query_params, headers=headers, timeout=15)
            else:
                 res = requests.post(url, json=request.data, headers=headers, timeout=15)
            return Response(res.json(), status=res.status_code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def get(self, request, endpoint): return self.handle_request(request, endpoint, 'GET')
    def post(self, request, endpoint): return self.handle_request(request, endpoint, 'POST')

class GeoServerProxyView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from django.conf import settings
        workspace = request.query_params.get('WORKSPACE', 'rajasthan')
        geoserver_base = settings.EXTERNAL_SERVICES["GEOSERVER_URL"]
        url = f"{geoserver_base}/{workspace}/wms"
        
        # Strip out custom WORKSPACE param before forwarding
        params = request.query_params.dict()
        params.pop('WORKSPACE', None)
        
        try:
            res = requests.get(url, params=params, timeout=10)
            try:
                data = res.json()
            except ValueError:
                # If it's not JSON (e.g., GeoServer XML exception), return text
                return Response({"error": "GeoServer returned non-JSON", "content": res.text}, status=500)
            return Response(data, status=res.status_code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
