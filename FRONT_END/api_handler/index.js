/**
 * API Handler - Main Export
 * 
 * Centralized API management for the application.
 * All API calls should go through this module.
 */

import backendApi from './backendApi';
import externalApi from './externalApi';
import config from './config';

// Export API clients
export { backendApi, externalApi, config };

// Export default object with all APIs (Backward compatible with old api.js)
export default {
    backend: backendApi,
    external: externalApi,
    config,
    setTokens: (access, refresh) => backendApi.setTokens(access, refresh),
    clearTokens: () => backendApi.clearTokens(),

    // Location API
    location: {
        getStates: (params) => backendApi.getStates(params),
        getDistricts: (params) => backendApi.getDistricts(params),
        getBlocks: (params) => backendApi.getBlocks(params),
        getGrampanchayats: (params) => backendApi.getGrampanchayats(params),
        getVillages: (params) => backendApi.getVillages(params),
        getLocationCodes: (params) => backendApi.getLocationCodes(params),

        // Boundaries (using standardized names)
        getBoundaryCollection: (params) => backendApi.getBoundaryCollection(params),
        getBoundaryByCode: (params) => backendApi.getBoundaryByCode(params),
        getPincode: (params) => backendApi.getAddressByLatLon(params.lat, params.lon, params.boundary),
        getAddressByLatLon: (lat, lon, boundary) => backendApi.getAddressByLatLon(lat, lon, boundary),
    },

    // Standardized Boundaries API
    boundaries: {
        getCollection: (params) => backendApi.getBoundaryCollection(params),
        getByCode: (params) => backendApi.getBoundaryByCode(params),

        // External boundaries
        getByVillageCode: (code) => externalApi.fetchBoundaryByVillageCode(code),
        getByGPCode: (code) => externalApi.fetchBoundaryByGPCode(code),
        getByBlockCode: (code) => externalApi.fetchBoundaryByBlockCode(code),
        getByDistrictCode: (code) => externalApi.fetchBoundaryByDistrictCode(code),
        getByCodes: (codes) => externalApi.fetchBoundaryByCodes(codes),
    },

    // Rainfall API
    rainfall: {
        getRecords: (params) => backendApi.getRainfallRecords(params),
    },

    // Water Quality API
    waterQuality: {
        getRecords: (params) => backendApi.getWaterQualityRecords(params),
        getStatistics: (params) => backendApi.getWaterQualityRecords({ ...params, type: 'stats' }), // Placeholder
    },

    // Auth API
    auth: {
        login: (credentials) => backendApi.login(credentials),
        register: (userData) => backendApi.register(userData),
        logout: () => backendApi.logout(),
        refreshToken: () => backendApi.refreshToken(),
    },

    // Geocoding API (External)
    geocoding: {
        getAddressByLatLon: (lat, lon, includeBoundary) =>
            externalApi.fetchAddressByCoordinates(lat, lon, includeBoundary),
        getMultiplePoints: (points) => externalApi.fetchMultiplePoints(points),
    }
};
