from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.http import FileResponse
import os
import uuid
import json
import time
from .renderer import MapRenderer

def cleanup_old_files(directory, max_age_seconds=300):
    """Delete files in the directory that are older than max_age_seconds."""
    if not os.path.exists(directory):
        return
    
    now = time.time()
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            if os.path.isfile(file_path):
                if now - os.path.getmtime(file_path) > max_age_seconds:
                    os.remove(file_path)
        except Exception as e:
            print(f"Error cleaning up file {filename}: {e}")

class ExportMapView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            # Simple cleanup of old files (older than 5 minutes)
            from django.conf import settings
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_exports')
            cleanup_old_files(temp_dir, max_age_seconds=300)

            data = request.data
            bbox = data.get('bbox') # [minx, miny, maxx, maxy]
            layers = data.get('layers', [])
            location_name = data.get('location_name', 'map')
            
            if not bbox or len(bbox) != 4:
                return Response({'error': 'Invalid bbox provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Generate unique filename
            filename = f"{location_name}_{uuid.uuid4().hex[:8]}.pdf"
            
            # Use MEDIA_ROOT for temporary files to make them accessible via URL
            from django.conf import settings
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_exports')
            output_path = os.path.join(temp_dir, filename)
            
            # Ensure directory exists
            if not os.path.exists(temp_dir):
                os.makedirs(temp_dir)

            # Render
            renderer = MapRenderer()
            display_title = f"Map of {location_name}" if location_name else "Map of Study Area"
            custom_styles = data.get('custom_styles', {})
            filters = data.get('filters', {})
            renderer.render(bbox, layers, output_path, title=display_title, custom_styles=custom_styles, filters=filters)

            # Generate absolute URL for the file
            file_url = request.build_absolute_uri(settings.MEDIA_URL + 'temp_exports/' + filename)

            print(file_url, bbox)
            
            return Response({
                'status': 'success',
                'message': 'Map exported successfully',
                'url': file_url,
                'filename': filename
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Export Error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
