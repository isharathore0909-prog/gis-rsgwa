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
            bbox = data.get('bbox')
            layers = data.get('layers', [])
            location_name = data.get('location_name', 'map')

            if not bbox or len(bbox) != 4:
                return Response({'error': 'Invalid bbox provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Clean location name
            import re
            clean_loc = re.sub(r'(_map|map|_)$', '', str(location_name), flags=re.IGNORECASE).strip()
            clean_loc = clean_loc.replace('_', ' ')
            
            # Generate unique filename
            filename = f"{clean_loc.replace(' ', '_')}_{uuid.uuid4().hex[:8]}.pdf"
            
            from django.conf import settings
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_exports')
            output_path = os.path.join(temp_dir, filename)
            
            if not os.path.exists(temp_dir):
                os.makedirs(temp_dir)

            # Render
            renderer = MapRenderer()
            
            filters = data.get('filters', {})
            layer_type = filters.get('type')
            base_title = "MAP"
            if layer_type:
                if layer_type == "Ground Water Resource Estimation":
                    base_title = "GROUNDWATER ESTIMATION MAP"
                elif layer_type == "Water Quality":
                    param = ""
                    if filters.get('showEC'): param = "(EC) "
                    elif filters.get('showTDS'): param = "(TDS) "
                    elif filters.get('showNitrate'): param = "(NITRATE) "
                    elif filters.get('showFluoride'): param = "(FLUORIDE) "
                    base_title = f"WATER QUALITY {param}MAP".strip()
                elif layer_type == "Well Inventory":
                    base_title = "WELL INVENTORY MAP"
                else:
                    base_title = f"{layer_type.upper()} MAP"
            
            loc_disp = clean_loc.upper() if clean_loc and clean_loc.lower() != 'map' else "STUDY AREA"
            display_title = f"{base_title} OF {loc_disp}"
            
            custom_styles = data.get('custom_styles', {})
            renderer.render(bbox, layers, output_path, title=display_title, custom_styles=custom_styles, filters=filters)

            # Verification: Ensure file was created
            if not os.path.exists(output_path):
                raise FileNotFoundError(f"Renderer failed to create output file: {output_path}")

            # Generate absolute URL for the file
            # settings.MEDIA_URL is often '/media/' so we ensure no double slash with temp_exports
            media_part = str(settings.MEDIA_URL).rstrip('/') + '/temp_exports/' + filename
            file_url = request.build_absolute_uri(media_part)
            
            import logging
            logging.getLogger(__name__).info(f"✅ Map successfully exported to {output_path}")

            return Response({
                'status': 'success',
                'message': 'Map exported successfully',
                'url': file_url,
                'filename': filename
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"❌ Export Execution Failed: {e}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
