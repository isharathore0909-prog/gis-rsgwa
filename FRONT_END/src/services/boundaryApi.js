/**
 * External Boundary API Service
 * 
 * Fetches boundary geometries from gpspl.geoplanetsolution.in
 * using location codes from the database.
 */

const EXTERNAL_API_CONFIG = {
    // Pointing to local backend proxy for security and to avoid Requestly requirement
    BASE_URL: 'http://localhost:8000/api',
    API_KEY: 'a5c8b623-33a2-4ab7-9b75-36589801b6ec',
    ENDPOINTS: {
        PINCODE: '/location/pincode/',
        BOUNDARY_BY_CODE: '/location/external-proxy/boundary-by-code/',
        MULTIPLE_POINTS: '/location/external-proxy/mpinp/',
    }
};

/**
 * Get headers for API requests
 */
const getHeaders = () => ({
    'X-Auth-Key': EXTERNAL_API_CONFIG.API_KEY,
    'Content-Type': 'application/json',
});

/**
 * Fetch boundary by village code
 * @param {string} villageCode - The village code
 * @returns {Promise<Object>} GeoJSON boundary data
 */
export const fetchBoundaryByVillageCode = async (villageCode) => {
    try {
        const url = `${EXTERNAL_API_CONFIG.BASE_URL}${EXTERNAL_API_CONFIG.ENDPOINTS.BOUNDARY_BY_CODE}?village_code=${villageCode}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching boundary for village ${villageCode}:`, error);
        return null;
    }
};

/**
 * Fetch boundary by GP code
 * @param {string} gpCode - The Gram Panchayat code
 * @returns {Promise<Object>} GeoJSON boundary data
 */
export const fetchBoundaryByGPCode = async (gpCode) => {
    try {
        const url = `${EXTERNAL_API_CONFIG.BASE_URL}${EXTERNAL_API_CONFIG.ENDPOINTS.BOUNDARY_BY_CODE}?gpcode=${gpCode}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching boundary for GP ${gpCode}:`, error);
        return null;
    }
};

/**
 * Fetch boundary by block code
 * @param {string} blockCode - The block code
 * @returns {Promise<Object>} GeoJSON boundary data
 */
export const fetchBoundaryByBlockCode = async (blockCode) => {
    try {
        const url = `${EXTERNAL_API_CONFIG.BASE_URL}${EXTERNAL_API_CONFIG.ENDPOINTS.BOUNDARY_BY_CODE}?block_code=${blockCode}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching boundary for block ${blockCode}:`, error);
        return null;
    }
};

/**
 * Fetch boundary by district code
 * @param {string} districtCode - The district code
 * @returns {Promise<Object>} GeoJSON boundary data
 */
export const fetchBoundaryByDistrictCode = async (districtCode) => {
    try {
        const url = `${EXTERNAL_API_CONFIG.BASE_URL}${EXTERNAL_API_CONFIG.ENDPOINTS.BOUNDARY_BY_CODE}?district_code=${districtCode}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching boundary for district ${districtCode}:`, error);
        return null;
    }
};

/**
 * Fetch address by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} includeBoundary - Whether to include boundary geometry
 * @returns {Promise<Object>} Address details
 */
export const fetchAddressByCoordinates = async (lat, lon, includeBoundary = false) => {
    try {
        let url = `${EXTERNAL_API_CONFIG.BASE_URL}${EXTERNAL_API_CONFIG.ENDPOINTS.PINCODE}?lat=${lat}&lon=${lon}`;
        if (includeBoundary) {
            url += '&boundary=true';
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching address for coordinates (${lat}, ${lon}):`, error);
        return null;
    }
};

/**
 * Fetch multiple boundaries by codes
 * @param {Object} codes - Object containing village_code, gpcode, block_code, or district_code
 * @returns {Promise<Object>} GeoJSON boundary data
 */
export const fetchBoundaryByCodes = async (codes) => {
    try {
        const params = new URLSearchParams();

        if (codes.village_code) params.append('village_code', codes.village_code);
        if (codes.gpcode) params.append('gpcode', codes.gpcode);
        if (codes.block_code) params.append('block_code', codes.block_code);
        if (codes.district_code) params.append('district_code', codes.district_code);

        if (params.toString() === '') {
            throw new Error('At least one code parameter must be provided');
        }

        const url = `${EXTERNAL_API_CONFIG.BASE_URL}${EXTERNAL_API_CONFIG.ENDPOINTS.BOUNDARY_BY_CODE}?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching boundary:', error);
        return null;
    }
};

/**
 * Convert external API response to GeoJSON FeatureCollection
 * @param {Object} apiResponse - Response from external API
 * @param {Object} properties - Additional properties to add to features
 * @returns {Object} GeoJSON FeatureCollection
 */
export const convertToGeoJSON = (apiResponse, properties = {}) => {
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

    return null;
};

export default {
    fetchBoundaryByVillageCode,
    fetchBoundaryByGPCode,
    fetchBoundaryByBlockCode,
    fetchBoundaryByDistrictCode,
    fetchAddressByCoordinates,
    fetchBoundaryByCodes,
    convertToGeoJSON,
    EXTERNAL_API_CONFIG
};
