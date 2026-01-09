/**
 * Location Code Service
 * 
 * Fetches location codes from the Django backend
 * to use with the external boundary API.
 */

import api from './api';

/**
 * Fetch all location codes
 * @returns {Promise<Array>} Array of location code objects
 */
export const getAllLocationCodes = async () => {
    try {
        const response = await fetch(`${api.baseURL}/api/location/location-codes/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching location codes:', error);
        return [];
    }
};

/**
 * Fetch location code by village name
 * @param {string} villageName - The village name
 * @returns {Promise<Object|null>} Location code object or null
 */
export const getLocationCodeByVillage = async (villageName) => {
    try {
        const response = await fetch(
            `${api.baseURL}/api/location/location-codes/?vlg_name=${encodeURIComponent(villageName)}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const results = data.results || data || [];
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error(`Error fetching location code for village ${villageName}:`, error);
        return null;
    }
};

/**
 * Fetch location codes by GP name
 * @param {string} gpName - The Gram Panchayat name
 * @returns {Promise<Array>} Array of location code objects
 */
export const getLocationCodesByGP = async (gpName) => {
    try {
        const response = await fetch(
            `${api.baseURL}/api/location/location-codes/?gp_name=${encodeURIComponent(gpName)}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error(`Error fetching location codes for GP ${gpName}:`, error);
        return [];
    }
};

/**
 * Fetch location codes by block name
 * @param {string} blockName - The block name
 * @returns {Promise<Array>} Array of location code objects
 */
export const getLocationCodesByBlock = async (blockName) => {
    try {
        const response = await fetch(
            `${api.baseURL}/api/location/location-codes/?block_name=${encodeURIComponent(blockName)}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error(`Error fetching location codes for block ${blockName}:`, error);
        return [];
    }
};

/**
 * Fetch location codes by district name
 * @param {string} districtName - The district name
 * @returns {Promise<Array>} Array of location code objects
 */
export const getLocationCodesByDistrict = async (districtName) => {
    try {
        const response = await fetch(
            `${api.baseURL}/api/location/location-codes/?dist_name=${encodeURIComponent(districtName)}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error(`Error fetching location codes for district ${districtName}:`, error);
        return [];
    }
};

/**
 * Get unique district codes
 * @returns {Promise<Array>} Array of unique district codes
 */
export const getUniqueDistrictCodes = async () => {
    try {
        const allCodes = await getAllLocationCodes();
        const uniqueDistricts = [...new Set(allCodes.map(code => ({
            name: code.dist_name,
            code: code.dist_code
        })))];
        return uniqueDistricts;
    } catch (error) {
        console.error('Error fetching unique district codes:', error);
        return [];
    }
};

/**
 * Get unique block codes for a district
 * @param {string} districtName - The district name
 * @returns {Promise<Array>} Array of unique block codes
 */
export const getUniqueBlockCodes = async (districtName) => {
    try {
        const codes = await getLocationCodesByDistrict(districtName);
        const uniqueBlocks = [...new Set(codes.map(code => ({
            name: code.block_name,
            code: code.block_code
        })))];
        return uniqueBlocks;
    } catch (error) {
        console.error(`Error fetching unique block codes for ${districtName}:`, error);
        return [];
    }
};

/**
 * Get unique GP codes for a block
 * @param {string} blockName - The block name
 * @returns {Promise<Array>} Array of unique GP codes
 */
export const getUniqueGPCodes = async (blockName) => {
    try {
        const codes = await getLocationCodesByBlock(blockName);
        const uniqueGPs = [...new Set(codes.map(code => ({
            name: code.gp_name,
            code: code.gp_code
        })))];
        return uniqueGPs;
    } catch (error) {
        console.error(`Error fetching unique GP codes for ${blockName}:`, error);
        return [];
    }
};

/**
 * Get unique village codes for a GP
 * @param {string} gpName - The GP name
 * @returns {Promise<Array>} Array of unique village codes
 */
export const getUniqueVillageCodes = async (gpName) => {
    try {
        const codes = await getLocationCodesByGP(gpName);
        return codes.map(code => ({
            name: code.vlg_name,
            code: code.vlg_code
        }));
    } catch (error) {
        console.error(`Error fetching unique village codes for ${gpName}:`, error);
        return [];
    }
};

export default {
    getAllLocationCodes,
    getLocationCodeByVillage,
    getLocationCodesByGP,
    getLocationCodesByBlock,
    getLocationCodesByDistrict,
    getUniqueDistrictCodes,
    getUniqueBlockCodes,
    getUniqueGPCodes,
    getUniqueVillageCodes
};
