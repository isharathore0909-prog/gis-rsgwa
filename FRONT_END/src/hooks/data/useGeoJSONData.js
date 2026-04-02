import { useState, useEffect } from 'react';

/**
 * Custom hook for loading GeoJSON files
 */
// Simple in-memory cache to prevent re-fetching static assets
const geoJSONCache = new Map();
const pendingRequests = new Map();

export const useGeoJSONData = (url, isActive) => {
    const [data, setData] = useState(geoJSONCache.get(url) || null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!isActive || !url) {
            setLoading(false);
            return;
        }

        if (geoJSONCache.has(url)) {
            setData(geoJSONCache.get(url));
            setLoading(false);
            return;
        }

        setLoading(true);

        if (pendingRequests.has(url)) {
            pendingRequests.get(url)
                .then(data => {
                    if (!ignore) {
                        setData(data);
                        setLoading(false);
                    }
                })
                .catch(err => {
                    if (!ignore) {
                        setError(err);
                        setLoading(false);
                    }
                });
            return;
        }

        const fetchPromise = fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
                return res.json();
            })
            .then(jsonData => {
                geoJSONCache.set(url, jsonData);
                pendingRequests.delete(url);
                if (!ignore) {
                    setData(jsonData);
                    setLoading(false);
                }
                return jsonData;
            })
            .catch(err => {
                pendingRequests.delete(url);
                if (!ignore) {
                    console.error(`[useGeoJSONData] Error loading ${url}:`, err);
                    setError(err);
                    setLoading(false);
                }
                throw err;
            });

        pendingRequests.set(url, fetchPromise);

        return () => { ignore = true; };
    }, [url, isActive]);

    return { data, loading, error };
};
