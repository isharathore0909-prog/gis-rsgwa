/**
 * API Handler - Main Export
 * 
 * Centralized API management for the application.
 * All API calls should go through this module.
 */

import backendApi from './backendApi';
import config from './config';

// Export API clients
export { backendApi, config };

// Export default object with all APIs (Backward compatible with old api.js)
export default {
    backend: backendApi,
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
    },

    rainfall: {
        getRecords: (params) => backendApi.getRainfallRecords(params),
        getStatistics: (params) => backendApi.getRainfallStatistics(params),
        getSummary: (params) => backendApi.getRainfallSummary(params),
        getNearby: (params) => backendApi.getRainfallNearby(params),
        getDistrictWise: (params) => backendApi.getRainfallDistrictWise(params),
        getLocationWise: (params) => backendApi.getRainfallLocationWise(params),
        getStations: (params) => backendApi.getRainfallStations(params),
        getStationRecords: (params) => backendApi.getRainfallStationRecords(params),
        getStationStatistics: (params) => backendApi.getRainfallStationStatistics(params),
        getStationSummary: (params) => backendApi.getRainfallStationSummary(params),
        getStationDistrictWise: (params) => backendApi.getRainfallStationDistrictWise(params),
        getStationLocationWise: (params) => backendApi.getRainfallStationLocationWise(params),
        getDistribution: (params) => backendApi.getRainfallDistribution(params),
        getStationDistribution: (params) => backendApi.getRainfallStationDistribution(params),
    },

    // Water Quality API
    waterQuality: {
        getRecords: (params) => backendApi.getWaterQualityRecords(params),
        getStatistics: (params) => backendApi.getWaterQualityStatistics(params),
        getCorrelation: (params) => backendApi.getWaterQualityCorrelation(params),
        getCorrelationMatrix: (params) => backendApi.getWaterQualityCorrelationMatrix(params),

        getAvailabilityRecords: (params) => backendApi.getWaterQualityAvailabilityRecords(params),
        getAvailabilityStatistics: (params) => backendApi.getWaterQualityAvailabilityStatistics(params),
    },

    // Aquifer API
    aquifer: {
        getRecords: (params) => backendApi.getAquiferRecords(params),
        getStatistics: (params) => backendApi.getAquiferStatistics(params),
        getYearlyStatistics: (params) => backendApi.getAquiferYearlyStatistics(params),
        getNearby: (params) => backendApi.getAquiferNearby(params),
        byLocation: (params) => backendApi.getAquiferByLocation(params),
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
};
