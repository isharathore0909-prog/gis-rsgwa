import logging
from django.db.models import QuerySet
from rest_framework import viewsets
from .base import BaseLocationViewSet
from ..models import Country, State, District, Block, Grampanchayat, Village, LocationCode
from ..serializers import (
    CountrySerializer, StateSerializer, DistrictSerializer, BlockSerializer, 
    GPSerializer, VillageSerializer
)

logger = logging.getLogger(__name__)

class CountryViewSet(BaseLocationViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer

class StateViewSet(BaseLocationViewSet):
    queryset = State.objects.all().order_by('name')
    serializer_class = StateSerializer

class DistrictViewSet(BaseLocationViewSet):
    queryset = District.objects.all().order_by('name')
    serializer_class = DistrictSerializer

    def get_queryset(self) -> QuerySet:
        if not District.objects.exists():
            try:
                india, _ = Country.objects.get_or_create(name="India")
                rajasthan, _ = State.objects.get_or_create(name="Rajasthan", country=india)
                codes = LocationCode.objects.values('dist_name', 'dist_code').distinct()
                for entry in codes:
                    if entry['dist_code']:
                        name = entry['dist_name'].strip()
                        District.objects.get_or_create(code=entry['dist_code'], defaults={'name': name, 'state': rajasthan})
                logger.info("✅ Auto-seeded districts from LocationCode")
            except Exception as e:
                logger.warning(f"District auto-seed failed: {e}")

        queryset = super().get_queryset()
        state_id = self.request.query_params.get('state')
        state_name = self.request.query_params.get('state_name')
        if state_id: queryset = queryset.filter(state_id=state_id)
        if state_name: queryset = queryset.filter(state__name__iexact=state_name)
        return queryset

class BlockViewSet(BaseLocationViewSet):
    queryset = Block.objects.all().order_by('name')
    serializer_class = BlockSerializer

    def get_queryset(self) -> QuerySet:
        dist_id = self.request.query_params.get('district')
        dist_name = self.request.query_params.get('district_name')
        if dist_name and not Block.objects.filter(district__name__iexact=dist_name).exists():
             try:
                dist_obj = District.objects.filter(name__iexact=dist_name).first()
                if dist_obj:
                    codes = LocationCode.objects.filter(dist_name__iexact=dist_name).values('block_name', 'block_code').distinct()
                    for entry in codes:
                        if entry['block_code']:
                            Block.objects.get_or_create(code=entry['block_code'], defaults={'name': entry['block_name'].strip(), 'district': dist_obj})
                    logger.info(f"✅ Auto-seeded blocks for district {dist_name}")
             except Exception as e:
                logger.warning(f"Block auto-seed failed for {dist_name}: {e}")

        queryset = super().get_queryset()
        if dist_id: queryset = queryset.filter(district_id=dist_id)
        if dist_name: queryset = queryset.filter(district__name__iexact=dist_name)
        return queryset

class GPViewSet(BaseLocationViewSet):
    queryset = Grampanchayat.objects.all().order_by('name')
    serializer_class = GPSerializer

    def get_queryset(self) -> QuerySet:
        block_id = self.request.query_params.get('block')
        block_name = self.request.query_params.get('block_name')
        if block_name and not Grampanchayat.objects.filter(block__name__iexact=block_name).exists():
             try:
                block_obj = Block.objects.filter(name__iexact=block_name).first()
                if block_obj:
                    codes = LocationCode.objects.filter(block_name__iexact=block_name).values('gp_name', 'gp_code').distinct()
                    for entry in codes:
                        if entry['gp_code']:
                            Grampanchayat.objects.get_or_create(code=entry['gp_code'], defaults={'name': entry['gp_name'].strip(), 'block': block_obj})
                    logger.info(f"✅ Auto-seeded GPs for block {block_name}")
             except Exception as e:
                logger.warning(f"GP auto-seed failed for {block_name}: {e}")

        queryset = super().get_queryset()
        if block_id: queryset = queryset.filter(block_id=block_id)
        if block_name: queryset = queryset.filter(block__name__iexact=block_name)
        return queryset

class VillageViewSet(BaseLocationViewSet):
    queryset = Village.objects.all().order_by('name')
    serializer_class = VillageSerializer

    def get_queryset(self) -> QuerySet:
        queryset = super().get_queryset()
        gp_id = self.request.query_params.get('gp')
        gp_name = self.request.query_params.get('gp_name')
        block_id = self.request.query_params.get('block')
        block_name = self.request.query_params.get('block_name')
        if gp_id: queryset = queryset.filter(grampanchayat_id=gp_id)
        elif gp_name: queryset = queryset.filter(grampanchayat__name__iexact=gp_name)
        elif block_id: queryset = queryset.filter(grampanchayat__block_id=block_id)
        elif block_name: queryset = queryset.filter(grampanchayat__block__name__iexact=block_name)
        return queryset
