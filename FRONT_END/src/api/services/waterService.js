import { BACKEND_API } from '../config';

export const createWaterService = (client) => ({
    getRecords: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY, params, signal),
    getStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY_STATISTICS, params, signal),
    getCorrelation: (params = {}, signal = null) => client.getWithApiKey('water-quality/correlation/', params, signal),
    getCorrelationMatrix: (params = {}, signal = null) => client.getWithApiKey('water-quality/correlation-matrix/', params, signal),
    getAvailabilityStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.WATER_QUALITY_AVAILABILITY_STATISTICS, params, signal),
    getPiezometerRecords: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.PIEZOMETER, params, signal),
    getRechargeStructureRecords: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RECHARGE_STRUCTURE, params, signal),
    getRechargeStructureStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.RECHARGE_STRUCTURE_STATISTICS, params, signal),
});
