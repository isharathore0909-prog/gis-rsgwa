/**
 * External Boundary API Client
 * 
 * Handles all requests to the external gpspl.geoplanetsolution.in API.
 */

import { EXTERNAL_API, getExternalHeaders, buildExternalUrl, API_CONFIG } from './config';

class ExternalAPIClient {
    constructor() {
        this.baseURL = EXTERNAL_API.BASE_URL;
        this.apiKey = EXTERNAL_API.API_KEY;
    }

    /**
     * Generic request method with retry logic
     */
    async request(url, options = {}, retries = API_CONFIG.RETRY_ATTEMPTS) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            if (retries > 0 && error.name !== 'AbortError') {
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
                return this.request(url, options, retries - 1);
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const url = buildExternalUrl(endpoint, params);
        const headers = getExternalHeaders();

        return this.request(url, {
            method: 'GET',
            headers,
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        const url = buildExternalUrl(endpoint);
        const headers = getExternalHeaders();

        return this.request(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
    }

    // ==================== Boundary Methods ====================

    /**
     * Fetch boundary by village code
     */
    async fetchBoundaryByVillageCode(villageCode) {
        try {
            const data = await this.get(EXTERNAL_API.ENDPOINTS.BOUNDARY_BY_CODE, {
                village_code: villageCode
            });
            return this.convertToGeoJSON(data, { village_code: villageCode, level: 'village' });
        } catch (error) {
            console.error(`Error fetching boundary for village ${villageCode}:`, error);
            return null;
        }
    }

    /**
     * Fetch boundary by GP code
     */
    async fetchBoundaryByGPCode(gpCode) {
        try {
            const data = await this.get(EXTERNAL_API.ENDPOINTS.BOUNDARY_BY_CODE, {
                gpcode: gpCode
            });
            return this.convertToGeoJSON(data, { gp_code: gpCode, level: 'gp' });
        } catch (error) {
            console.error(`Error fetching boundary for GP ${gpCode}:`, error);
            return null;
        }
    }

    /**
     * Fetch boundary by block code
     */
    async fetchBoundaryByBlockCode(blockCode) {
        try {
            const data = await this.get(EXTERNAL_API.ENDPOINTS.BOUNDARY_BY_CODE, {
                block_code: blockCode
            });
            return this.convertToGeoJSON(data, { block_code: blockCode, level: 'block' });
        } catch (error) {
            console.error(`Error fetching boundary for block ${blockCode}:`, error);
            return null;
        }
    }

    /**
     * Fetch boundary by district code
     */
    async fetchBoundaryByDistrictCode(districtCode) {
        try {
            const data = await this.get(EXTERNAL_API.ENDPOINTS.BOUNDARY_BY_CODE, {
                district_code: districtCode
            });
            return this.convertToGeoJSON(data, { district_code: districtCode, level: 'district' });
        } catch (error) {
            console.error(`Error fetching boundary for district ${districtCode}:`, error);
            return null;
        }
    }

    /**
     * Fetch boundary by multiple codes
     */
    async fetchBoundaryByCodes(codes) {
        try {
            const params = {};
            if (codes.village_code) params.village_code = codes.village_code;
            if (codes.gpcode) params.gpcode = codes.gpcode;
            if (codes.block_code) params.block_code = codes.block_code;
            if (codes.district_code) params.district_code = codes.district_code;

            if (Object.keys(params).length === 0) {
                throw new Error('At least one code parameter must be provided');
            }

            const data = await this.get(EXTERNAL_API.ENDPOINTS.BOUNDARY_BY_CODE, params);
            return this.convertToGeoJSON(data, codes);
        } catch (error) {
            console.error('Error fetching boundary:', error);
            return null;
        }
    }

    /**
     * Fetch address by coordinates
     */
    async fetchAddressByCoordinates(lat, lon, includeBoundary = false) {
        try {
            const params = { lat, lon };
            if (includeBoundary) params.boundary = 'true';

            return await this.get(EXTERNAL_API.ENDPOINTS.PINCODE, params);
        } catch (error) {
            console.error(`Error fetching address for coordinates (${lat}, ${lon}):`, error);
            return null;
        }
    }

    /**
     * Fetch multiple points
     */
    async fetchMultiplePoints(points) {
        try {
            return await this.post(EXTERNAL_API.ENDPOINTS.MULTIPLE_POINTS, { points });
        } catch (error) {
            console.error('Error fetching multiple points:', error);
            return null;
        }
    }

    // ==================== Utility Methods ====================

    /**
     * Convert API response to GeoJSON FeatureCollection
     */
    convertToGeoJSON(apiResponse, properties = {}) {
        if (!apiResponse) return null;

        // If already a FeatureCollection, return as is
        if (apiResponse.type === 'FeatureCollection') {
            return apiResponse;
        }

        // If it's a single Feature, wrap it in a FeatureCollection
        if (apiResponse.type === 'Feature') {
            return {
                type: 'FeatureCollection',
                features: [{
                    ...apiResponse,
                    properties: {
                        ...apiResponse.properties,
                        ...properties
                    }
                }]
            };
        }

        // If it's geometry only, create a Feature and FeatureCollection
        if (apiResponse.type && ['Polygon', 'MultiPolygon', 'Point', 'LineString'].includes(apiResponse.type)) {
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: apiResponse,
                    properties: properties
                }]
            };
        }

        // If response has a 'boundary' field
        if (apiResponse.boundary) {
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: apiResponse.boundary,
                    properties: {
                        ...apiResponse,
                        ...properties,
                        boundary: undefined // Remove boundary from properties
                    }
                }]
            };
        }

        return null;
    }
}

// Export singleton instance
export default new ExternalAPIClient();
