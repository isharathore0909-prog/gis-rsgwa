import { BACKEND_API } from '../api/config';
const BASE_URL = BACKEND_API.BASE_URL;

const api = {
    baseURL: BASE_URL, // Export baseURL for use in other services

    getToken() {
        return localStorage.getItem('access_token');
    },

    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Potential token refresh logic here
            this.clearTokens();
            // window.location.href = '/login'; // Or handle via state
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `API error: ${response.statusText}`);
        }

        return response.json();
    },

    async get(endpoint, params = {}, options = {}) {
        const url = new URL(`${BASE_URL}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const token = this.getToken();
        const headers = {
            ...options.headers,
        };

        if (token && !headers['Authorization'] && !headers['X-Auth-Key']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url.toString(), {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `API error: ${response.statusText}`);
        }
        return response.json();
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Auth
    auth: {
        login: (credentials) => api.post('/account/login/', credentials),
        register: (userData) => api.post('/account/register/', userData),
        refreshToken: (refresh) => api.post('/account/token/refresh/', { refresh }),
    },

    // Location API helpers
    location: {
        getStates: (params) => api.get('/location/states/', params),
        getDistricts: (params) => api.get('/location/districts/', params),
        getBlocks: (params) => api.get('/location/blocks/', params),
        getVillages: (params) => api.get('/location/villages/', params),
        getGrampanchayats: (params) => api.get('/location/grampanchayats/', params),

        // Location codes
        getLocationCodes: (params) => api.get('/location/location-codes/', params),

        // New methods for boundaries
        getBoundaryByCode: (params, apiKey) => api.get('/location/boundary-by-code/', params, {
            headers: apiKey ? { 'X-Auth-Key': apiKey } : {}
        }),
        getBoundaryCollection: (params, apiKey) => api.get('/location/boundary-collection/', params, {
            headers: apiKey ? { 'X-Auth-Key': apiKey } : {}
        }),
        getAddressByLatLon: (params, apiKey) => api.get('/location/pincode/', params, {
            headers: apiKey ? { 'X-Auth-Key': apiKey } : {}
        }),
        bulkUpdateBoundaries: (data, apiKey) => api.request('/location/pincode/', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: apiKey ? { 'X-Auth-Key': apiKey } : {}
        }),
    },

    // Rainfall API helpers
    rainfall: {
        getRecords: (params) => api.get('/rainfall/records/', params),
    },

    // Water Quality API helpers
    waterQuality: {
        getRecords: (params) => api.get('/water-quality/', params),
        getStatistics: (params) => api.get('/water-quality/statistics/', params),
        getByLocation: (params) => api.get('/water-quality/by_location/', params),
    }
};

export default api;
