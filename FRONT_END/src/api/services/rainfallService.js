import { BACKEND_API } from '../config';

export const createRainfallService = (client) => ({
    getRecords: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL, params, signal),
    getStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATISTICS, params, signal),
    getSummary: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_SUMMARY, params, signal),
    getNearby: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_NEARBY, params, signal),
    getDistrictWise: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_DISTRICT_WISE, params, signal),
    getLocationWise: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_LOCATION_WISE, params, signal),
    getStations: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATIONS, params, signal),
    getStationRecords: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_RECORDS, params, signal),
    getStationStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_STATISTICS, params, signal),
    getStationSummary: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_SUMMARY, params, signal),
    getStationDistrictWise: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_DISTRICT_WISE, params, signal),
    getStationLocationWise: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_LOCATION_WISE, params, signal),
    getDistribution: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_DISTRIBUTION, params, signal),
    getStationDistribution: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RAINFALL_STATION_DISTRIBUTION, params, signal),
});
