"""
core/services/cache_utils.py

Shared cache-key utilities for DRF viewsets.
Provides a single, consistent way to build per-request cache keys so that
statistical endpoints never accidentally share cached data across different
location / date / parameter combinations.

Usage:
    from core.services.cache_utils import build_cache_key

    cache_key = build_cache_key("rainfall_stats", request)
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
    ...
    cache.set(cache_key, result, 3600)
"""

_SKIP_PARAMS = frozenset({'page', 'limit', 'offset', 'format'})


def build_cache_key(prefix: str, request, *, extra: str = "") -> str:
    """
    Build a deterministic cache key from a prefix and all relevant query
    parameters attached to *request*.

    Parameters
    ----------
    prefix : str
        A short, descriptive prefix uniquely identifying the endpoint
        (e.g. ``"rainfall_stats"``, ``"wq_by_loc_district"``).
    request :
        The DRF / Django ``Request`` object.  ``request.query_params``
        (a ``QueryDict``) is used as the source of filter values.
    extra : str, optional
        Any additional discriminator string to append (e.g. a computed
        ``timestep`` value already extracted from the request).

    Returns
    -------
    str
        A cache key in the form:
        ``"<prefix>__<k1>=<v1>_<k2>=<v2>.__extra"``
        If no relevant query params are present, the key becomes
        ``"<prefix>__all"``.

    Examples
    --------
    >>> build_cache_key("aquifer_stats", request, extra=str(year))
    'aquifer_stats__district=Jaipur_year=2024.2024'
    """
    import re
    import hashlib

    params = request.query_params

    parts = [
        f"{k}={v}"
        for k, v in sorted(params.items())
        if k not in _SKIP_PARAMS
    ]

    param_str = "_".join(parts) if parts else "all"
    
    # Sanitize: replace spaces and other illegal characters
    param_str = re.sub(r'[\s:?#\[\]@!$&\'()*+,;=]', '_', param_str)

    # Memcached has a limit of 250 characters. Hashing long keys ensures safety.
    if len(prefix) + len(param_str) + len(extra) > 200:
        hash_str = hashlib.md5(param_str.encode('utf-8')).hexdigest()
        param_str = f"hash_{hash_str}"

    if extra:
        extra_sanitized = re.sub(r'[\s:?#\[\]@!$&\'()*+,;=]', '_', str(extra))
        return f"{prefix}__{param_str}.{extra_sanitized}"
    return f"{prefix}__{param_str}"
