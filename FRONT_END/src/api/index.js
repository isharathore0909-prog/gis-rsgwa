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
        getStatistics: (params) => backendApi.getRainfallStatistics(params),
        getSummary: (params) => backendApi.getRainfallSummary(params),
        getNearby: (params) => backendApi.getRainfallNearby(params),
        getDistrictWise: (params) => backendApi.getRainfallDistrictWise(params),
        getStations: (params) => backendApi.getRainfallStations(params),
        getStationRecords: (params) => backendApi.getRainfallStationRecords(params),
        getStationStatistics: (params) => backendApi.getRainfallStationStatistics(params),
        getStationSummary: (params) => backendApi.getRainfallStationSummary(params),
        getStationDistrictWise: (params) => backendApi.getRainfallStationDistrictWise(params),
    },

    // Water Quality API
    waterQuality: {
        getRecords: (params) => backendApi.getWaterQualityRecords(params),
        getStatistics: (params) => backendApi.getWaterQualityStatistics(params),
        getContourMap: (params) => backendApi.getWaterQualityContourMap(params),
        getAvailabilityRecords: (params) => backendApi.getWaterQualityAvailabilityRecords(params),
        getAvailabilityStatistics: (params) => backendApi.getWaterQualityAvailabilityStatistics(params),
    },

    // Aquifer API
    aquifer: {
        getRecords: (params) => backendApi.getAquiferRecords(params),
        getStatistics: (params) => backendApi.getAquiferStatistics(params),
        getYearlyStatistics: (params) => backendApi.getAquiferYearlyStatistics(params),
        getNearby: (params) => backendApi.getAquiferNearby(params),
    },

    // Recharge Structure API
    rechargeStructure: {
        getRecords: (params) => backendApi.getRechargeStructureRecords(params),
        getStatistics: (params) => backendApi.getRechargeStructureStatistics(params),
    },

    // Piezometer API
    piezometer: {
        getRecords: (params) => backendApi.getPiezometerRecords(params),
    },

    // Spatial Layer API
    spatialLayer: {
        getLayers: (params) => backendApi.getSpatialLayers(params),
        getStatistics: (params) => backendApi.getSpatialStatistics(params),
        getIntersect: (params) => backendApi.getSpatialIntersect(params),
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
