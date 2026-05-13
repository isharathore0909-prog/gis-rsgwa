import axios from 'axios';
import { BACKEND_API, API_CONFIG } from './config';
import { createLocationService } from './services/locationService';
import { createRainfallService } from './services/rainfallService';
import { createAquiferService } from './services/aquiferService';
import { createWaterService } from './services/waterService';
import { createSpatialService } from './services/spatialService';
import { createAuthService } from './services/authService';

/**
 * Backend API Client using Axios
 * Refactored to use modular services while maintaining full backward compatibility.
 */
class BackendAPIClient {
    constructor() {
        this.client = axios.create({
            baseURL: BACKEND_API.BASE_URL,
            timeout: API_CONFIG.TIMEOUT,
        });

        this.cache = new Map();
        this._loadCache();

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

        this.client.interceptors.response.use(
            (response) => {
                if (response.config.method === 'get') {
                    const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
                    const cacheEntry = { data: response.data, timestamp: Date.now() };
                    this.cache.set(cacheKey, cacheEntry);
                    this._saveToPersistentCache(cacheKey, cacheEntry);
                }
                return response.data;
            },
            async (error) => {
                const originalRequest = error.config;
                if (!error.response || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
                    originalRequest._retryCount = originalRequest._retryCount || 0;
                    if (originalRequest._retryCount < API_CONFIG.RETRY_ATTEMPTS) {
                        originalRequest._retryCount += 1;
                        const delay = Math.min(Math.pow(2, originalRequest._retryCount - 1) * API_CONFIG.RETRY_DELAY, 30000);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.client(originalRequest);
                    }
                }
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    try {
                        const refreshed = await this.refreshToken();
                        if (refreshed) {
                            const newToken = localStorage.getItem('access_token');
                            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) { return Promise.reject(refreshError); }
                }
                return Promise.reject(new Error(error.response?.data?.detail || error.response?.data?.message || error.message));
            }
        );

        // Domain Services
        const loc = createLocationService(this);
        const rain = createRainfallService(this);
        const aq = createAquiferService(this);
        const water = createWaterService(this);
        const spatial = createSpatialService(this);
        const auth = createAuthService(this);

        // Attach short names for service internal use
        Object.assign(this, loc, rain, aq, water, spatial, auth);

        // --- Explicit Backward Compatibility Mapping ---
        
        // Location
        this.getStates = loc.getStates;
        this.getDistricts = loc.getDistricts;
        this.getBlocks = loc.getBlocks;
        this.getGrampanchayats = loc.getGrampanchayats;
        this.getVillages = loc.getVillages;
        this.getLocationCodes = loc.getLocationCodes;
        this.getBoundaryCollection = loc.getBoundaryCollection;
        this.getBoundaryByCode = loc.getBoundaryByCode;
        this.getAddressByLatLon = loc.getAddressByLatLon;
        this.pointIdentify = loc.pointIdentify;

        // Rainfall
        this.getRainfallRecords = rain.getRecords;
        this.getRainfallStatistics = rain.getStatistics;
        this.getRainfallSummary = rain.getSummary;
        this.getRainfallNearby = rain.getNearby;
        this.getRainfallDistrictWise = rain.getDistrictWise;
        this.getRainfallLocationWise = rain.getLocationWise;
        this.getRainfallStations = rain.getStations;
        this.getRainfallStationRecords = rain.getStationRecords;
        this.getRainfallStationStatistics = rain.getStationStatistics;
        this.getRainfallStationSummary = rain.getStationSummary;
        this.getRainfallStationDistrictWise = rain.getStationDistrictWise;
        this.getRainfallStationLocationWise = rain.getStationLocationWise;
        this.getRainfallDistribution = rain.getDistribution;
        this.getRainfallStationDistribution = rain.getStationDistribution;

        // Aquifer
        this.getAquiferRecords = aq.getRecords;
        this.getAquiferStatistics = aq.getStatistics;
        this.getAquiferYearlyStatistics = aq.getYearlyStatistics;
        this.getAquiferNearby = aq.getNearby;
        this.getAquiferByLocation = aq.byLocation;
        this.getAquiferDecadalAnalysis = aq.getDecadalAnalysis;

        // Water Quality
        this.getWaterQualityRecords = water.getRecords;
        this.getWaterQualityStatistics = water.getStatistics;
        this.getWaterQualityCorrelation = water.getCorrelation;
        this.getWaterQualityCorrelationMatrix = water.getCorrelationMatrix;
        this.getWaterQualityAvailabilityStatistics = water.getAvailabilityStatistics;
        this.getPiezometerRecords = water.getPiezometerRecords;
        this.getRechargeStructureRecords = water.getRechargeStructureRecords;
        this.getRechargeStructureStatistics = water.getRechargeStructureStatistics;

        // Spatial
        this.getSpatialLayers = spatial.getLayers;
        this.getSpatialStatistics = spatial.getStatistics;
        this.getSpatialIntersect = spatial.getIntersect;
    }

    async getCached(endpoint, params = {}, headers = {}, signal = null) {
        const cacheKey = endpoint + JSON.stringify(params || {});
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 300000)) return cached.data;
        return this.client.get(endpoint, { params, headers, signal });
    }

    getWithApiKey(endpoint, params = {}, signal = null) {
        return this.getCached(endpoint, params, { 'x-auth-key': BACKEND_API.API_KEY }, signal);
    }

    setTokens(access, refresh) {
        if (access) localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
    }

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.cache.clear();
    }

    _loadCache() {
        try {
            const stored = sessionStorage.getItem('gis_api_cache');
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([key, val]) => {
                    if (Date.now() - val.timestamp < 1800000) this.cache.set(key, val);
                });
            }
        } catch (e) { }
    }

    _saveToPersistentCache(key, entry) {
        try {
            const stored = sessionStorage.getItem('gis_api_cache');
            const cacheObj = stored ? JSON.parse(stored) : {};
            cacheObj[key] = entry;
            if (Object.keys(cacheObj).length > 100) {
                const sortedKeys = Object.keys(cacheObj).sort((a, b) => cacheObj[a].timestamp - cacheObj[b].timestamp);
                delete cacheObj[sortedKeys[0]];
            }
            sessionStorage.setItem('gis_api_cache', JSON.stringify(cacheObj));
        } catch (e) { }
    }

    _clearPersistentCache() {
        try {
            sessionStorage.removeItem('gis_api_cache');
            this.cache.clear();
        } catch (e) { }
    }
}

export default new BackendAPIClient();
