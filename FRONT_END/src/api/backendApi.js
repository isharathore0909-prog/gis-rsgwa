import axios from 'axios';
import { BACKEND_API, API_CONFIG } from './config';

/**
 * Backend API Client using Axios
 */
class BackendAPIClient {
    constructor() {
        this.client = axios.create({
            baseURL: BACKEND_API.BASE_URL,
            timeout: API_CONFIG.TIMEOUT,
        });

        // Request Interceptor
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('access_token');
                if (token && !config.headers['X-Auth-Key']) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response Interceptor for Token Refresh
        this.client.interceptors.response.use(
            (response) => response.data,
            async (error) => {
                const originalRequest = error.config;

                // If error is 401 and we haven't retried yet
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const refreshed = await this.refreshToken();
                        if (refreshed) {
                            const newToken = localStorage.getItem('access_token');
                            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }

                // Generic error handling
                const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
                return Promise.reject(new Error(errorMessage));
            }
        );
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) return false;

            const response = await axios.post(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.TOKEN_REFRESH}`, {
                refresh: refreshToken
            });

            if (response.data?.access) {
                localStorage.setItem('access_token', response.data.access);
                return true;
            }

            this.clearTokens();
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearTokens();
            return false;
        }
    }

    /**
     * Set authentication tokens
     */
    setTokens(access, refresh) {
        if (access) localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
    }

    /**
     * Clear authentication tokens
     */
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    /**
     * Helper for API Key requests
     */
    getWithApiKey(endpoint, params = {}) {
        return this.client.get(endpoint, {
            params,
            headers: { 'X-Auth-Key': BACKEND_API.API_KEY }
        });
    }

    // ==================== API Methods ====================

    getStates(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.STATES, params); }
    getDistricts(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.DISTRICTS, params); }
    getBlocks(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.BLOCKS, params); }
    getGrampanchayats(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.GRAMPANCHAYATS, params); }
    getVillages(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.VILLAGES, params); }
    getLocationCodes(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.LOCATION_CODES, params); }

    getBoundaryCollection(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.BOUNDARY_COLLECTION, params); }
    getBoundaryByCode(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.BOUNDARY_BY_CODE, params); }

    getAddressByLatLon(lat, lon, includeBoundary = false) {
        const params = { lat, lon };
        if (includeBoundary) params.boundary = 'true';
        return this.getWithApiKey(BACKEND_API.ENDPOINTS.PINCODE, params);
    }

    getRainfallRecords(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL, params); }
    getRainfallStatistics(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATISTICS, params); }
    getRainfallSummary(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_SUMMARY, params); }
    getRainfallNearby(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_NEARBY, params); }
    getRainfallDistrictWise(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_DISTRICT_WISE, params); }

    getWaterQualityRecords(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY, params); }
    getWaterQualityStatistics(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY_STATISTICS, params); }

    getAquiferRecords(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER, params); }
    getAquiferStatistics(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_STATISTICS, params); }
    getAquiferNearby(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_NEARBY, params); }

    getRechargeStructureRecords(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RECHARGE_STRUCTURE, params); }
    getRechargeStructureStatistics(params = {}) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RECHARGE_STRUCTURE_STATISTICS, params); }

    async login(credentials) {
        const data = await this.client.post(BACKEND_API.ENDPOINTS.LOGIN, credentials);
        if (data.access) {
            this.setTokens(data.access, data.refresh);
        }
        return data;
    }

    register(userData) { return this.client.post(BACKEND_API.ENDPOINTS.REGISTER, userData); }
    logout() { this.clearTokens(); }
}

export default new BackendAPIClient();
