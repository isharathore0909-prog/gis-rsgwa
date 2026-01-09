from rest_framework.permissions import BasePermission

class IsAdminApiKey(BasePermission):
    def has_permission(self, request, view):
        # request.auth will be the ApiKey object if authenticated via ApiKeyAuthentication
        return (
            hasattr(request, "auth") and 
            request.auth is not None and 
            hasattr(request.auth, "name_of_org") and
            request.auth.name_of_org.lower() == "admin"
        )

class HasValidApiKey(BasePermission):
    def has_permission(self, request, view):
        # Allow if authenticated via API Key
        return hasattr(request, "auth") and request.auth is not None
