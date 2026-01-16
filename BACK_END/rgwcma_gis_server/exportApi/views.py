from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse
import os
import uuid
import json
from .renderer import MapRenderer

from rest_framework.permissions import AllowAny

class ExportMapView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = request.data
            bbox = data.get('bbox') # [minx, miny, maxx, maxy]
            layers = data.get('layers', [])
            location_name = data.get('location_name', 'map')
            
            if not bbox or len(bbox) != 4:
                return Response({'error': 'Invalid bbox provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Generate unique filename
            filename = f"{location_name}_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join('tmp', filename)
            
            # Ensure tmp dir exists
            if not os.path.exists('tmp'):
                os.makedirs('tmp')

            # Render
            renderer = MapRenderer()
            display_title = f"Map of {location_name}" if location_name else "Map of Study Area"
            custom_styles = data.get('custom_styles', {})
            filters = data.get('filters', {})
            renderer.render(bbox, layers, output_path, title=display_title, custom_styles=custom_styles, filters=filters)

            # Return file
            response = FileResponse(open(output_path, 'rb'), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        except Exception as e:
            print(f"Export Error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
