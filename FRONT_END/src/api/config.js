/**
 * API Configuration
 * 
 * Centralized configuration for all API endpoints and keys.
 * Uses environment variables for security and flexibility.
 */

// Backend API Configuration
export const BACKEND_API = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'https://rgwcma-gis.geoplanetsolution.in/api'),
    API_KEY: import.meta.env.VITE_INTERNAL_API_KEY || 'e32ebc1d-fe04-4bd7-9003-df5274c990e2',
    ENDPOINTS: {
        // Location endpoints
        STATES: '/location/states/',
        DISTRICTS: '/location/districts/',
        BLOCKS: '/location/blocks/',
        GRAMPANCHAYATS: '/location/gp/',
        VILLAGES: '/location/villages/',
        LOCATION_CODES: '/location/location-codes/',

        // Boundary endpoints
        BOUNDARY_COLLECTION: '/location/boundary-collection/',
        BOUNDARY_BY_CODE: '/location/boundary-by-code/',
        PINCODE: '/location/pincode/',

        // Data endpoints
        RAINFALL: '/rainfall/records/',
        RAINFALL_STATISTICS: '/rainfall/records/statistics/',
        RAINFALL_SUMMARY: '/rainfall/records/summary/',
        RAINFALL_NEARBY: '/rainfall/records/nearby/',
        RAINFALL_DISTRICT_WISE: '/rainfall/records/district_wise/',
        WATER_QUALITY: '/water-quality/',
        WATER_QUALITY_STATISTICS: '/water-quality/statistics/',
        AQUIFER: '/aquifer/',
        AQUIFER_STATISTICS: '/aquifer/statistics/',
        AQUIFER_NEARBY: '/aquifer/nearby/',
        RECHARGE_STRUCTURE: '/recharge-structure/',
        RECHARGE_STRUCTURE_STATISTICS: '/recharge-structure/statistics/',

        // Auth endpoints
        LOGIN: '/account/login/',
        REGISTER: '/account/register/',
        TOKEN_REFRESH: '/account/token/refresh/',
    }
};

// External Boundary API Configuration (Now Proxied through Backend)
const BACKEND_URL_BASE = import.meta.env.VITE_API_BASE_URL || 'https://rgwcma-gis.geoplanetsolution.in/api';

export const EXTERNAL_API = {
    BASE_URL: BACKEND_URL_BASE,
    // When calling our proxy, we use our internal backend API key
    API_KEY: import.meta.env.VITE_INTERNAL_API_KEY || 'e32ebc1d-fe04-4bd7-9003-df5274c990e2',
    ENDPOINTS: {
        BOUNDARY_BY_CODE: '/location/external-proxy/boundary-by-code/',
        PINCODE: '/location/pincode/', // Already proxied in backend
        MULTIPLE_POINTS: '/location/external-proxy/mpinp/',
    }
};

// API Request Configuration
export const API_CONFIG = {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
};

// Headers Configuration
export const getBackendHeaders = (includeAuth = true) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (includeAuth) {
        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

export const getExternalHeaders = () => ({
    'X-Auth-Key': EXTERNAL_API.API_KEY,
    'Content-Type': 'application/json',
});

export const getInternalApiKeyHeaders = () => ({
    'X-Auth-Key': BACKEND_API.API_KEY,
    'Content-Type': 'application/json',
});

// Build full URL
export const buildBackendUrl = (endpoint, params = {}) => {
    const url = new URL(`${BACKEND_API.BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
        }
    });
    return url.toString();
};

export const buildExternalUrl = (endpoint, params = {}) => {
    const url = new URL(`${EXTERNAL_API.BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
        }
    });
    return url.toString();
};

// Export all configurations
export default {
    BACKEND_API,
    EXTERNAL_API,
    API_CONFIG,
    getBackendHeaders,
    getExternalHeaders,
    getInternalApiKeyHeaders,
    buildBackendUrl,
    buildExternalUrl,
};
