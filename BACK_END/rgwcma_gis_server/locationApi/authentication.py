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
    keyword = 'x-auth-key'

    def authenticate(self, request):
        # ✅ Allow preflight requests
        if request.method == "OPTIONS":
            return None

        api_key = request.headers.get(self.keyword)

        if not api_key:
            return None

        try:
            api_key_str = str(api_key).strip()
            uuid_obj = uuid.UUID(api_key_str)

            # Query active keys
            key = ApiKey.objects.filter(api_key=uuid_obj, is_active=True).first()
            
            if key:
                return (None, key)
            
            raise AuthenticationFailed("Invalid or inactive API Key")
            
        except ValueError:
            raise AuthenticationFailed("Invalid API Key format")
        except Exception as e:
            logger.error(f"Unexpected Error during API Key authentication: {e}", exc_info=True)
            raise AuthenticationFailed("Authentication Error")
