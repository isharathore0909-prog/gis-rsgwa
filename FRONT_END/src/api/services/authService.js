import { BACKEND_API } from '../config';
import axios from 'axios';

export const createAuthService = (client) => ({
    login: async (credentials) => {
        const data = await client.client.post(BACKEND_API.ENDPOINTS.LOGIN, credentials);
        if (data.access) {
            client.setTokens(data.access, data.refresh);
        }
        return data;
    },
    register: (userData) => client.client.post(BACKEND_API.ENDPOINTS.REGISTER, userData),
    refreshToken: async () => {
        if (client.refreshPromise) {
            return client.refreshPromise;
        }

        client.refreshPromise = (async () => {
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) return false;

                const response = await axios.post(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.TOKEN_REFRESH}`, {
                    refresh: refreshToken
                });

                if (response.data?.access) {
                    localStorage.setItem('access_token', response.data.access);
                    return true;
                }

                client.clearTokens();
                return false;
            } catch (error) {
                console.error('Token refresh failed:', error);
                client.clearTokens();
                return false;
            } finally {
                client.refreshPromise = null;
            }
        })();

        return client.refreshPromise;
    },
    logout: () => {
        client.clearTokens();
        client._clearPersistentCache();
    }
});
