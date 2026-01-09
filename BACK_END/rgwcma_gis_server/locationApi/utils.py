"""
Location API Utilities
======================
Helper functions for fetching boundaries from external API using location codes.
"""

import requests
from rgwcma_gis_server.config import (
    EXTERNAL_API_CONFIG,
    get_api_key_from_db,
    build_boundary_url,
    get_headers,
    get_location_code_by_village,
    get_location_codes_by_gp,
    get_location_codes_by_block,
    get_location_codes_by_district,
)


def fetch_boundary_by_village_code(village_code):
    """
    Fetch boundary geometry for a village using its code.
    
    Args:
        village_code (str): The village code
        
    Returns:
        dict: GeoJSON response or None if error
    """
    try:
        url = build_boundary_url(village_code=village_code)
        headers = get_headers()
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching boundary for village {village_code}: {e}")
        return None


def fetch_boundary_by_gp_code(gp_code):
    """
    Fetch boundary geometry for a Gram Panchayat using its code.
    
    Args:
        gp_code (str): The GP code
        
    Returns:
        dict: GeoJSON response or None if error
    """
    try:
        url = build_boundary_url(gp_code=gp_code)
        headers = get_headers()
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching boundary for GP {gp_code}: {e}")
        return None


def fetch_boundary_by_block_code(block_code):
    """
    Fetch boundary geometry for a Block using its code.
    
    Args:
        block_code (str): The block code
        
    Returns:
        dict: GeoJSON response or None if error
    """
    try:
        url = build_boundary_url(block_code=block_code)
        headers = get_headers()
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching boundary for block {block_code}: {e}")
        return None


def fetch_boundary_by_district_code(district_code):
    """
    Fetch boundary geometry for a District using its code.
    
    Args:
        district_code (str): The district code
        
    Returns:
        dict: GeoJSON response or None if error
    """
    try:
        url = build_boundary_url(district_code=district_code)
        headers = get_headers()
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching boundary for district {district_code}: {e}")
        return None


def fetch_address_by_coordinates(lat, lon, include_boundary=False):
    """
    Fetch address details for given coordinates.
    
    Args:
        lat (float): Latitude
        lon (float): Longitude
        include_boundary (bool): Whether to include boundary geometry
        
    Returns:
        dict: Address details or None if error
    """
    try:
        base_url = EXTERNAL_API_CONFIG['BASE_URL']
        endpoint = EXTERNAL_API_CONFIG['ENDPOINTS']['PINCODE']
        
        params = f"lat={lat}&lon={lon}"
        if include_boundary:
            params += "&boundary=true"
        
        url = f"{base_url}{endpoint}?{params}"
        headers = get_headers()
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching address for coordinates ({lat}, {lon}): {e}")
        return None


def get_all_village_codes():
    """
    Get all village codes from the database.
    
    Returns:
        list: List of village codes
    """
    try:
        from locationApi.models import LocationCode
        return list(LocationCode.objects.values_list('vlg_code', flat=True))
    except Exception as e:
        print(f"Error fetching village codes: {e}")
        return []


def get_all_gp_codes():
    """
    Get all unique GP codes from the database.
    
    Returns:
        list: List of GP codes
    """
    try:
        from locationApi.models import LocationCode
        return list(LocationCode.objects.values_list('gp_code', flat=True).distinct())
    except Exception as e:
        print(f"Error fetching GP codes: {e}")
        return []


def get_all_block_codes():
    """
    Get all unique block codes from the database.
    
    Returns:
        list: List of block codes
    """
    try:
        from locationApi.models import LocationCode
        return list(LocationCode.objects.values_list('block_code', flat=True).distinct())
    except Exception as e:
        print(f"Error fetching block codes: {e}")
        return []


def get_all_district_codes():
    """
    Get all unique district codes from the database.
    
    Returns:
        list: List of district codes
    """
    try:
        from locationApi.models import LocationCode
        return list(LocationCode.objects.values_list('dist_code', flat=True).distinct())
    except Exception as e:
        print(f"Error fetching district codes: {e}")
        return []


def get_location_hierarchy(village_code):
    """
    Get the complete location hierarchy for a village code.
    
    Args:
        village_code (str): The village code
        
    Returns:
        dict: Dictionary with district, block, GP, and village details
    """
    location = get_location_code_by_village(village_code)
    if location:
        return {
            'district': {
                'name': location.dist_name,
                'code': location.dist_code,
            },
            'block': {
                'name': location.block_name,
                'code': location.block_code,
            },
            'gp': {
                'name': location.gp_name,
                'code': location.gp_code,
            },
            'village': {
                'name': location.vlg_name,
                'code': location.vlg_code,
            }
        }
    return None
