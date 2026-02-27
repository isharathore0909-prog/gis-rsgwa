import json
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.db.models.functions import Intersection
from .models import SpatialLayer
from .serializers import SpatialLayerSerializer


def _get_boundary_geometry(district=None, block=None, grampanchayat=None):
    """
    Look up boundary geometry from location tables using PostGIS.
    Returns a GEOS geometry object or None.
    Priority: GP > Block > District
    """
    try:
        from locationApi.models import District as DistrictModel, Block as BlockModel, Grampanchayat as GrampanchayatModel
        from django.db.models import Q

        if grampanchayat and block and district:
            gp = GrampanchayatModel.objects.filter(
                Q(name__iexact=grampanchayat),
                block__name__iexact=block,
                block__district__name__iexact=district
            ).exclude(geometry__isnull=True).first()
            if gp and gp.geometry:
                geom = gp.geometry
                if abs(geom.centroid.x) > 180:
                    geom.srid = 3857
                    geom.transform(4326)
                return geom

        if block and district:
            blk = BlockModel.objects.filter(
                Q(name__iexact=block),
                district__name__iexact=district
            ).exclude(geometry__isnull=True).first()
            if blk and blk.geometry:
                geom = blk.geometry
                if abs(geom.centroid.x) > 180:
                    geom.srid = 3857
                    geom.transform(4326)
                return geom

        if district:
            dist = DistrictModel.objects.filter(
                name__iexact=district
            ).exclude(geometry__isnull=True).first()
            if dist and dist.geometry:
                geom = dist.geometry
                if abs(geom.centroid.x) > 180:
                    geom.srid = 3857
                    geom.transform(4326)
                return geom

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Boundary geometry lookup failed: {e}")

    return None


class SpatialLayerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SpatialLayer.objects.all()
    serializer_class = SpatialLayerSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['layer_type']

    def list(self, request, *args, **kwargs):
        layer_type = request.query_params.get('layer_type')
        if not layer_type:
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())

        # Optimize by getting only necessary fields and using GeoJSON from DB if possible
        features = []
        for obj in queryset:
            geom_data = None
            if obj.geometry:
                geom_data = json.loads(obj.geometry.geojson)

            features.append({
                "type": "Feature",
                "id": obj.id,
                "properties": {
                    "name": obj.name,
                    "layer_type": obj.layer_type,
                    **obj.properties
                },
                "geometry": geom_data
            })

        return Response({
            "type": "FeatureCollection",
            "features": features
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get statistics for a specific layer type, filtered by spatial intersection
        with the selected boundary (district/block/grampanchayat).
        """
        layer_type = request.query_params.get('layer_type', 'aquifer')
        district = request.query_params.get('district', '').strip()
        block = request.query_params.get('block', '').strip()
        grampanchayat = request.query_params.get('grampanchayat', '').strip() or \
                        request.query_params.get('gp', '').strip()

        queryset = SpatialLayer.objects.filter(layer_type=layer_type)

        spatial_filter_applied = False
        boundary_geom = _get_boundary_geometry(
            district=district or None,
            block=block or None,
            grampanchayat=grampanchayat or None
        )

        if boundary_geom:
            try:
                if queryset.filter(geometry__intersects=boundary_geom).exists():
                    queryset = queryset.filter(geometry__intersects=boundary_geom)
                    spatial_filter_applied = True
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Spatial filter failed: {e}")

        if not spatial_filter_applied and district:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(properties__District__iexact=district) |
                Q(properties__DISTRICT__iexact=district) |
                Q(properties__New_Dist__iexact=district) |
                Q(properties__DIST_NAME__iexact=district) |
                Q(properties__dist_name__iexact=district)
            )

        # Performance optimization: Use values() to avoid model instantiation
        items = queryset.values('id', 'name', 'properties', 'geometry')
        
        data = {}
        for obj in items:
            props = obj.get('properties', {})
            
            # Layer-specific property identification
            if layer_type == 'aquifer':
                cat_name = (
                    props.get('Aquifer') or props.get('aquifer') or
                    props.get('AQUIFER') or props.get('Aquifer_Type') or
                    obj.get('name') or 'Unknown'
                )
            elif layer_type == 'groundwater_zone':
                cat_name = (
                    props.get('Category') or props.get('CATEGORY') or
                    props.get('GWDL') or props.get('category') or
                    'Unknown'
                )
                # Standardize GWRE categories
                cat_lower = str(cat_name).lower().strip()
                if 'over' in cat_lower and 'exploited' in cat_lower: cat_name = 'Over Exploited'
                elif 'semi' in cat_lower: cat_name = 'Semi Critical'
                elif 'critical' in cat_lower: cat_name = 'Critical'
                elif 'safe' in cat_lower: cat_name = 'Safe'
                elif 'saline' in cat_lower: cat_name = 'Saline'
            else:
                cat_name = obj.get('name') or 'Other'

            area_val = 0
            geom = obj.get('geometry')
            
            # Ensure we have a valid GEOS geometry with SRID
            if geom and hasattr(geom, 'transform') and geom.srid:
                try:
                    # Check if coordinates are valid WGS84 and within reasonable Rajasthan bounds
                    # Lat: 23-30N, Lon: 69-78E. We'll be slightly broader.
                    c = geom.centroid
                    if c and (20 < c.y < 40) and (65 < c.x < 85):
                        g_metric = geom.transform(32643, clone=True)
                        area_val = g_metric.area / 1_000_000
                except Exception:
                    # Fallback if transform fails or SRID is missing/invalid
                    pass

            if area_val <= 0:
                stored_area = (
                    props.get('Area') or props.get('AREA') or props.get('AREA_SQ_KM') or 
                    props.get('Area_SqKm') or props.get('Shape_Area') or 0
                )
                try: area_val = float(stored_area)
                except: area_val = 0

            if cat_name not in data:
                data[cat_name] = {'count': 0, 'area': 0.0}
            
            data[cat_name]['count'] += 1
            data[cat_name]['area'] += area_val

        result = [
            {'name': name, 'count': s['count'], 'area': round(s['area'], 2)}
            for name, s in data.items()
        ]
        
        # Sort logic
        total_area = sum(s['area'] for s in data.values())
        result.sort(key=lambda x: x['area'] if total_area > 0 else x['count'], reverse=True)

        return Response({
            'layer_type': layer_type,
            'district': district or None,
            'spatial_filter_applied': spatial_filter_applied,
            'total_count': sum(s['count'] for s in data.values()),
            'total_area': round(total_area, 2),
            'distribution': result
        })

    @action(detail=False, methods=['get'])
    def intersect(self, request):
        """
        Return aquifer (or other layer) features clipped to the boundary geometry.
        """
        layer_type = request.query_params.get('layer_type', 'aquifer')
        district = request.query_params.get('district', '').strip()
        block = request.query_params.get('block', '').strip()
        grampanchayat = request.query_params.get('grampanchayat', '').strip() or \
                        request.query_params.get('gp', '').strip()

        queryset = SpatialLayer.objects.filter(layer_type=layer_type)

        boundary_geom = _get_boundary_geometry(
            district=district or None,
            block=block or None,
            grampanchayat=grampanchayat or None
        )

        has_boundary = False
        if boundary_geom:
            try:
                if queryset.filter(geometry__intersects=boundary_geom).exists():
                    queryset = queryset.filter(geometry__intersects=boundary_geom).annotate(
                        clipped_geometry=Intersection('geometry', boundary_geom)
                    )
                    has_boundary = True
            except Exception:
                pass

        if not has_boundary and district:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(properties__District__iexact=district) |
                Q(properties__DISTRICT__iexact=district) |
                Q(properties__New_Dist__iexact=district) |
                Q(properties__DIST_NAME__iexact=district) |
                Q(properties__dist_name__iexact=district)
            )

        features = []
        for obj in queryset:
            geom_data = None
            # Use clipped geometry if available
            geometry = getattr(obj, 'clipped_geometry', obj.geometry)
            if geometry:
                try:
                    # Skip empty geometries after intersection
                    if geometry.empty:
                        continue
                    geom_data = json.loads(geometry.geojson)
                except Exception:
                    pass

            features.append({
                "type": "Feature",
                "id": obj.id,
                "properties": {
                    "name": obj.name,
                    "layer_type": obj.layer_type,
                    **obj.properties
                },
                "geometry": geom_data
            })

        return Response({
            "type": "FeatureCollection",
            "boundary_filter": {
                "district": district or None,
                "block": block or None,
                "grampanchayat": grampanchayat or None,
                "spatial_intersection": boundary_geom is not None
            },
            "feature_count": len(features),
            "features": features
        })
