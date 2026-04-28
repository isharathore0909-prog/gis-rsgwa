/**
 * API Utilities
 * 
 * Shared logic for handling API responses and extracting data records.
 */

/**
 * Extracts list components from complex API responses.
 * Handles standard DRF results, nested data objects, and object-wrapped lists.
 */
export const extractApiResults = (response) => {
    if (!response) return [];

    // Standard DRF or array
    if (Array.isArray(response)) return response;
    if (response.results && Array.isArray(response.results)) return response.results;

    // Nested data object
    if (response.data?.results && Array.isArray(response.data.results)) return response.data.results;
    if (response.data && Array.isArray(response.data)) return response.data;

    // Object-wrapped results (where results might be direct children)
    if (typeof response === 'object') {
        return Object.values(response).filter(item => typeof item === 'object' && !Array.isArray(item));
    }

    return [];
};
