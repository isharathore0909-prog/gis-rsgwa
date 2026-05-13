import { BACKEND_API } from '../config';

export const createSpatialService = (client) => ({
    getLayers: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS, params, signal),
    getStatistics: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS_STATISTICS, params, signal),
    getIntersect: (params = {}, signal = null) => client.getWithApiKey(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS_INTERSECT, params, signal),
});
