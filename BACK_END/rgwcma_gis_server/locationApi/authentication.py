import logging
import uuid
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import ApiKey

logger = logging.getLogger(__name__)

class ApiKeyAuthentication(BaseAuthentication):
    """
    Custom authentication class for API Key validation.
    Expects 'X-Auth-Key' header containing a valid and active UUID API key.
    """
    keyword = 'X-Auth-Key'

    def authenticate(self, request):
        api_key = request.headers.get(self.keyword)

        if not api_key:
            return None  # DRF will handle permission denial if no other auth succeeds

        try:
            api_key_str = str(api_key).strip()
            
            # Since api_key field is UUIDField, we need to convert to UUID object
            try:
                uuid_obj = uuid.UUID(api_key_str)
            except ValueError:
                logger.warning(f"Invalid UUID format received in API Key: {api_key_str}")
                raise AuthenticationFailed("Invalid API Key format")

            # Query active keys
            key = ApiKey.objects.filter(api_key=uuid_obj, is_active=True).first()
            
            if key:
                return (None, key)
            
            # Diagnostic check for inactive or missing keys (only for internal logs)
            if ApiKey.objects.filter(api_key=uuid_obj).exists():
                logger.info(f"Authentication failed: Found inactive API Key for UUID {uuid_obj}")
            else:
                logger.info(f"Authentication failed: API Key {uuid_obj} not found in database")
                
            raise AuthenticationFailed("Invalid or inactive API Key")
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"Unexpected Error during API Key authentication: {e}", exc_info=True)
            raise AuthenticationFailed("Authentication Error")
