import { BACKEND_API } from '../config';

export const createLocationService = (client) => ({
    getStates: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.STATES, params, signal),
    getDistricts: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.DISTRICTS, params, signal),
    getBlocks: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.BLOCKS, params, signal),
    getGrampanchayats: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.GRAMPANCHAYATS, params, signal),
    getVillages: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.VILLAGES, params, signal),
    getLocationCodes: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.LOCATION_CODES, params, signal),
    getBoundaryCollection: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.BOUNDARY_COLLECTION, params, signal),
    getBoundaryByCode: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.BOUNDARY_BY_CODE, params, signal),
    getPincode: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.PINCODE, params, signal),
    getAddressByLatLon: (lat, lon, includeBoundary = false, signal = null) => {
        const params = { lat, lon };
        if (includeBoundary) params.boundary = 'true';
        return client.getWithApiKey(BACKEND_API.ENDPOINTS.PINCODE, params, signal);
    },
    pointIdentify: (lat, lon, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.POINT_IDENTIFY, { lat, lon }, signal),
});
