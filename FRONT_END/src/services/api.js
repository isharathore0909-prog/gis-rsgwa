const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = {
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

    async get(endpoint, params = {}) {
        const url = new URL(`${BASE_URL}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const response = await fetch(url, {
            headers: this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
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
    },

    // Rainfall API helpers
    rainfall: {
        getRecords: (params) => api.get('/rainfall/records/', params),
    }
};

export default api;
