"""
Global Configuration for External Location API
================================================
This module provides global configuration for accessing the external
geoplanetsolution.in API for fetching boundary geometries.

API Details:
- Base URL: http://gpspl.geoplanetsolution.in
- Authentication: X-Auth-Key header
- API Key stored in: locationApi_apikey table
"""

# External API Configuration
EXTERNAL_API_CONFIG = {
    'BASE_URL': 'http://gpspl.geoplanetsolution.in',
    'API_KEY': '00e94e69243f442580830ecfee5abe8f',
    'ENDPOINTS': {
        'PINCODE': '/pincode/',
        'BOUNDARY_BY_CODE': '/boundary-by-code/',
        'MULTIPLE_POINTS': '/mpinp/',
    },
    'HEADERS': {
        'X-Auth-Key': '00e94e69243f442580830ecfee5abe8f',
        'Content-Type': 'application/json',
    }
}

# Location Code API Configuration
LOCATION_CODE_CONFIG = {
    'DB_TABLE': 'locationApi_locationcode',
    'FIELDS': {
        'DISTRICT_NAME': 'dist_name',
        'DISTRICT_CODE': 'dist_code',
        'BLOCK_NAME': 'block_name',
        'BLOCK_CODE': 'block_code',
        'GP_NAME': 'gp_name',
        'GP_CODE': 'gp_code',
        'VILLAGE_NAME': 'vlg_name',
        'VILLAGE_CODE': 'vlg_code',
    }
}


def get_api_key_from_db():
    """
    Fetch the API key from the database.
    Returns the API key string or None if not found.
    """
    try:
        from locationApi.models import ApiKey
        api_key_obj = ApiKey.objects.filter(is_active=True).first()
        if api_key_obj:
            return str(api_key_obj.api_key)
        return EXTERNAL_API_CONFIG['API_KEY']  # Fallback to hardcoded key
    except Exception as e:
        print(f"Error fetching API key from database: {e}")
        return EXTERNAL_API_CONFIG['API_KEY']  # Fallback to hardcoded key


def get_location_codes():
    """
    Fetch all location codes from the database.
    Returns a queryset of LocationCode objects.
    """
    try:
        from locationApi.models import LocationCode
        return LocationCode.objects.all()
    except Exception as e:
        print(f"Error fetching location codes: {e}")
        return None


def get_location_code_by_village(village_code):
    """
    Fetch location code details by village code.
    
    Args:
        village_code (str): The village code to search for
        
    Returns:
        LocationCode object or None
    """
    try:
        from locationApi.models import LocationCode
        return LocationCode.objects.filter(vlg_code=village_code).first()
    except Exception as e:
        print(f"Error fetching location code by village: {e}")
        return None


def get_location_codes_by_gp(gp_code):
    """
    Fetch all location codes for a specific Gram Panchayat.
    
    Args:
        gp_code (str): The GP code to filter by
        
    Returns:
        QuerySet of LocationCode objects
    """
    try:
        from locationApi.models import LocationCode
        return LocationCode.objects.filter(gp_code=gp_code)
    except Exception as e:
        print(f"Error fetching location codes by GP: {e}")
        return None


def get_location_codes_by_block(block_code):
    """
    Fetch all location codes for a specific Block.
    
    Args:
        block_code (str): The block code to filter by
        
    Returns:
        QuerySet of LocationCode objects
    """
    try:
        from locationApi.models import LocationCode
        return LocationCode.objects.filter(block_code=block_code)
    except Exception as e:
        print(f"Error fetching location codes by block: {e}")
        return None


def get_location_codes_by_district(district_code):
    """
    Fetch all location codes for a specific District.
    
    Args:
        district_code (str): The district code to filter by
        
    Returns:
        QuerySet of LocationCode objects
    """
    try:
        from locationApi.models import LocationCode
        return LocationCode.objects.filter(dist_code=district_code)
    except Exception as e:
        print(f"Error fetching location codes by district: {e}")
        return None


def build_boundary_url(village_code=None, gp_code=None, block_code=None, district_code=None):
    """
    Build the complete URL for fetching boundary by code.
    
    Args:
        village_code (str, optional): Village code
        gp_code (str, optional): GP code
        block_code (str, optional): Block code
        district_code (str, optional): District code
        
    Returns:
        str: Complete URL with query parameters
    """
    base_url = EXTERNAL_API_CONFIG['BASE_URL']
    endpoint = EXTERNAL_API_CONFIG['ENDPOINTS']['BOUNDARY_BY_CODE']
    
    params = []
    if village_code:
        params.append(f"village_code={village_code}")
    if gp_code:
        params.append(f"gpcode={gp_code}")
    if block_code:
        params.append(f"block_code={block_code}")
    if district_code:
        params.append(f"district_code={district_code}")
    
    if not params:
        raise ValueError("At least one code parameter must be provided")
    
    query_string = "&".join(params)
    return f"{base_url}{endpoint}?{query_string}"


def get_headers():
    """
    Get the headers for API requests with the current API key.
    
    Returns:
        dict: Headers dictionary with API key
    """
    api_key = get_api_key_from_db()
    return {
        'X-Auth-Key': api_key,
        'Content-Type': 'application/json',
    }
