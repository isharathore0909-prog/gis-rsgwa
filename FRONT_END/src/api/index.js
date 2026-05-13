/**
 * API Handler - Main Export
 * Standardized entry point for all API services.
 */

import backendApi from './backendApi';
import config from './config';
import { createLocationService } from './services/locationService';
import { createRainfallService } from './services/rainfallService';
import { createAquiferService } from './services/aquiferService';
import { createWaterService } from './services/waterService';
import { createSpatialService } from './services/spatialService';
import { createAuthService } from './services/authService';

// Initialize categorized services
const location = createLocationService(backendApi);
const rainfall = createRainfallService(backendApi);
const aquifer = createAquiferService(backendApi);
const waterQuality = createWaterService(backendApi);
const spatialLayer = createSpatialService(backendApi);
const auth = createAuthService(backendApi);

// Export units
export {
    backendApi,
    config,
    location,
    rainfall,
    aquifer,
    waterQuality,
    spatialLayer,
    auth
};

// Default export for generic 'api' usage (Maintains backward compatibility with grouped namespaces)
export default {
    backend: backendApi,
    config,
    location,
    boundaries: {
        getCollection: (params) => location.getBoundaryCollection(params),
        getByCode: (params) => location.getBoundaryByCode(params),
    },
    rainfall,
    waterQuality,
    aquifer,
    rechargeStructure: {
        getRecords: (params) => waterQuality.getRechargeStructureRecords(params),
        getStatistics: (params) => waterQuality.getRechargeStructureStatistics(params),
    },
    piezometer: {
        getRecords: (params) => waterQuality.getPiezometerRecords(params),
    },
    spatialLayer,
    auth,
    setTokens: (access, refresh) => backendApi.setTokens(access, refresh),
    clearTokens: () => backendApi.clearTokens(),
};
