import logging

logger = logging.getLogger(__name__)

class BrokenPipeMiddleware:
    """
    Middleware to handle BrokenPipeError gracefully.
    When a client cancels a request (e.g., frontend AbortController), 
    Django might raise a BrokenPipeError when trying to write the response.
    This middleware catches it and logs a clean message instead of a full traceback.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except (BrokenPipeError, ConnectionResetError):
            logger.info("Client disconnected: Broken pipe or Connection reset")
            # We can't really return a response here as the pipe is broken
            # but returning None or a dummy response is fine as Django/WSGI handles it
            return None
    
    def process_exception(self, request, exception):
        if isinstance(exception, (BrokenPipeError, ConnectionResetError)):
            logger.info("Handled BrokenPipeError in process_exception")
            return None
        return None
