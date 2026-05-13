import { BACKEND_API } from '../config';

export const createAquiferService = (client) => ({
    getRecords: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER, params, signal),
    getStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_STATISTICS, params, signal),
    getYearlyStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_YEARLY_STATISTICS, params, signal),
    getNearby: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_NEARBY, params, signal),
    byLocation: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.AQUIFER_BY_LOCATION, params, signal),
    getDecadalAnalysis: (params = {}, signal = null) => client.getWithApiKey('aquifer/decadal_analysis/', params, signal),
    getYearData: (params = {}, signal = null) => client.getWithApiKey('aquifer/year_data/', params, signal),
});
