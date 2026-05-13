import { useState, useEffect } from 'react';
import api from '../../api';
import { notificationService } from '../../services/notificationService';

/**
 * Custom hook to fetch the specific geometry of the selected unit (Block, GP, Village) for zooming.
 */
export const useSelectedBoundaryGeometry = (filters) => {
    const [boundary, setBoundary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const activeLevel = filters?.village ? 'village' : (filters?.gramPanchayat ? 'gp' : (filters?.block ? 'block' : null));
    const activeCode = filters?.vlgCode || filters?.gpCode || filters?.blockCode;
    const activeId = filters?.vlgId || filters?.gpId || filters?.blockId;

    useEffect(() => {
        if (!activeLevel || (!activeCode && !activeId)) {
            setBoundary(null);
            setError(null);
            return;
        }

        let ignore = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch high-precision boundary by code/id
                const params = { layer: activeLevel };
                if (activeCode) params.code = activeCode;
                if (activeId) params.id = activeId;

                const result = await api.location.getBoundaryByCode(params);
                if (!ignore && result) {
                    setBoundary(result);
                }
            } catch (err) {
                console.error('[useSelectedBoundaryGeometry] Error:', err);
                if (!ignore) {
                    setError(err.message);
                    notificationService.error(`Failed to fetch boundary geometry: ${err.message}`);
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [activeLevel, activeCode, activeId]);

    return { boundary, loading, error };
};
