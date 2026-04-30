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

        // Simple cache for GET requests
        this.cache = new Map();

        // Request Interceptor
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('access_token');
                if (token && !config.headers['X-Auth-Key']) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }

                // If this is a GET request and we have it in cache, we'll handle it in the response interceptor
                // or by returning a special config but Axios doesn't support returning data from request interceptor easily.
                // We'll use a helper method instead.
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response Interceptor for Token Refresh and Caching
        this.client.interceptors.response.use(
            (response) => {
                // Cache successful GET requests
                if (response.config.method === 'get') {
                    const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
                    this.cache.set(cacheKey, {
                        data: response.data,
                        timestamp: Date.now()
                    });
                }
                return response.data;
            },
            async (error) => {
                const originalRequest = error.config;

                // Network error retry logic with exponential backoff
                if (!error.response || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
                    originalRequest._retryCount = originalRequest._retryCount || 0;
                    if (originalRequest._retryCount < API_CONFIG.RETRY_ATTEMPTS) {
                        originalRequest._retryCount += 1;

                        // Capped backoff for reliability
                        const rawDelay = Math.pow(2, originalRequest._retryCount - 1) * API_CONFIG.RETRY_DELAY;
                        const delay = Math.min(rawDelay, API_CONFIG.MAX_RETRY_DELAY || 30000);
                        console.warn(`🔄 Retrying request (${originalRequest._retryCount}/${API_CONFIG.RETRY_ATTEMPTS}) in ${delay}ms: ${originalRequest.url}`);

                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.client(originalRequest);
                    }
                }

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
     * Cache-aware GET helper
     */
    async getCached(endpoint, params = {}, headers = {}, signal = null) {
        const cacheKey = endpoint + JSON.stringify(params || {});
        const cached = this.cache.get(cacheKey);

        // Use cache if it's less than 5 minutes old
        if (cached && (Date.now() - cached.timestamp < 300000)) {
            return cached.data;
        }

        return this.client.get(endpoint, { params, headers, signal });
    }

    /**
     * Refresh authentication token
     * Synchronized to prevent multiple concurrent refresh calls
     */
    async refreshToken() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
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
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
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
        this.cache.clear(); // Clear cache on logout
    }

    /**
     * Helper for API Key requests
     */
    getWithApiKey(endpoint, params = {}, signal = null) {
        return this.getCached(endpoint, params, { 'x-auth-key': BACKEND_API.API_KEY }, signal);
    }

    // ==================== API Methods ====================

    getStates(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.STATES, params, signal); }
    getDistricts(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.DISTRICTS, params, signal); }
    getBlocks(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.BLOCKS, params, signal); }
    getGrampanchayats(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.GRAMPANCHAYATS, params, signal); }
    getVillages(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.VILLAGES, params, signal); }
    getLocationCodes(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.LOCATION_CODES, params, signal); }

    getBoundaryCollection(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.BOUNDARY_COLLECTION, params, signal); }
    getBoundaryByCode(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.BOUNDARY_BY_CODE, params, signal); }

    getAddressByLatLon(lat, lon, includeBoundary = false, signal = null) {
        const params = { lat, lon };
        if (includeBoundary) params.boundary = 'true';
        return this.getWithApiKey(BACKEND_API.ENDPOINTS.PINCODE, params, signal);
    }

    pointIdentify(lat, lon, signal = null) {
        return this.getWithApiKey(BACKEND_API.ENDPOINTS.POINT_IDENTIFY, { lat, lon }, signal);
    }

    getRainfallRecords(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL, params, signal); }
    getRainfallStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATISTICS, params, signal); }
    getRainfallSummary(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_SUMMARY, params, signal); }
    getRainfallNearby(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_NEARBY, params, signal); }
    getRainfallDistrictWise(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_DISTRICT_WISE, params, signal); }
    getRainfallLocationWise(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_LOCATION_WISE, params, signal); }
    getRainfallStations(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATIONS, params, signal); }
    getRainfallStationRecords(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_RECORDS, params, signal); }
    getRainfallStationStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_STATISTICS, params, signal); }
    getRainfallStationSummary(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_SUMMARY, params, signal); }
    getRainfallStationDistrictWise(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_DISTRICT_WISE, params, signal); }
    getRainfallStationLocationWise(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_LOCATION_WISE, params, signal); }
    getRainfallDistribution(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_DISTRIBUTION, params, signal); }
    getRainfallStationDistribution(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_DISTRIBUTION, params, signal); }

    getWaterQualityRecords(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY, params, signal); }
    getWaterQualityStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY_STATISTICS, params, signal); }
    getWaterQualityCorrelation(params = {}, signal = null) { return this.getWithApiKey('water-quality/correlation/', params, signal); }
    getWaterQualityCorrelationMatrix(params = {}, signal = null) { return this.getWithApiKey('water-quality/correlation-matrix/', params, signal); }

    getWaterQualityAvailabilityStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY_AVAILABILITY_STATISTICS, params, signal); }

    getAquiferRecords(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER, params, signal); }
    getAquiferStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_STATISTICS, params, signal); }
    getAquiferYearlyStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_YEARLY_STATISTICS, params, signal); }
    getAquiferNearby(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_NEARBY, params, signal); }
    getAquiferByLocation(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_BY_LOCATION, params, signal); }

    getRechargeStructureRecords(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RECHARGE_STRUCTURE, params, signal); }
    getRechargeStructureStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.RECHARGE_STRUCTURE_STATISTICS, params, signal); }

    getPiezometerRecords(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.PIEZOMETER, params, signal); }
    getSpatialLayers(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS, params, signal); }
    getSpatialStatistics(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS_STATISTICS, params, signal); }
    getSpatialIntersect(params = {}, signal = null) { return this.getWithApiKey(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS_INTERSECT, params, signal); }

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
