/**
 * Backend API Client
 * 
 * Handles all requests to the Django backend API.
 */

import { BACKEND_API, getBackendHeaders, getInternalApiKeyHeaders, buildBackendUrl, API_CONFIG } from './config';

class BackendAPIClient {
    constructor() {
        this.baseURL = BACKEND_API.BASE_URL;
    }

    /**
     * Generic request method with retry logic
     */
    async request(url, options = {}, retries = API_CONFIG.RETRY_ATTEMPTS) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    const refreshed = await this.refreshToken();
                    if (refreshed && retries > 0) {
                        return this.request(url, options, retries - 1);
                    }
                }

                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            if (retries > 0 && error.name !== 'AbortError') {
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
                return this.request(url, options, retries - 1);
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}, useApiKey = false) {
        const url = buildBackendUrl(endpoint, params);
        const headers = useApiKey ? getInternalApiKeyHeaders() : getBackendHeaders();

        return this.request(url, {
            method: 'GET',
            headers,
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data, useApiKey = false) {
        const url = buildBackendUrl(endpoint);
        const headers = useApiKey ? getInternalApiKeyHeaders() : getBackendHeaders();

        return this.request(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, useApiKey = false) {
        const url = buildBackendUrl(endpoint);
        const headers = useApiKey ? getInternalApiKeyHeaders() : getBackendHeaders();

        return this.request(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, useApiKey = false) {
        const url = buildBackendUrl(endpoint);
        const headers = useApiKey ? getInternalApiKeyHeaders() : getBackendHeaders();

        return this.request(url, {
            method: 'DELETE',
            headers,
        });
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) return false;

            const response = await fetch(buildBackendUrl(BACKEND_API.ENDPOINTS.TOKEN_REFRESH), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                return true;
            }

            // Refresh failed, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Set authentication tokens in local storage
     */
    setTokens(access, refresh) {
        if (access) localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
    }

    /**
     * Clear authentication tokens from local storage
     */
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    // ==================== Location API ====================

    async getStates(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.STATES, params, true);
    }

    async getDistricts(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.DISTRICTS, params, true);
    }

    async getBlocks(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.BLOCKS, params, true);
    }

    async getGrampanchayats(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.GRAMPANCHAYATS, params, true);
    }

    async getVillages(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.VILLAGES, params, true);
    }

    async getLocationCodes(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.LOCATION_CODES, params, true);
    }

    // ==================== Boundary API ====================

    async getBoundaryCollection(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.BOUNDARY_COLLECTION, params, true);
    }

    async getBoundaryByCode(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.BOUNDARY_BY_CODE, params, true);
    }

    async getAddressByLatLon(lat, lon, includeBoundary = false) {
        const params = { lat, lon };
        if (includeBoundary) params.boundary = 'true';
        return this.get(BACKEND_API.ENDPOINTS.PINCODE, params, true);
    }

    // ==================== Data API ====================

    async getRainfallRecords(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.RAINFALL, params, true);
    }

    async getWaterQualityRecords(params = {}) {
        return this.get(BACKEND_API.ENDPOINTS.WATER_QUALITY, params, true);
    }

    // ==================== Auth API ====================

    async login(credentials) {
        const data = await this.post(BACKEND_API.ENDPOINTS.LOGIN, credentials);
        if (data.access) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
        }
        return data;
    }

    async register(userData) {
        return this.post(BACKEND_API.ENDPOINTS.REGISTER, userData);
    }

    logout() {
        this.clearTokens();
    }
}

// Export singleton instance
export default new BackendAPIClient();
