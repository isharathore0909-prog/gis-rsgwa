import { useState, useEffect } from 'react';
import api from '../../api';

// GeoServer WFS layer map — same layers already used for WMS rendering
const LAYER_MAP = {
    district: 'rgwcma:locationApi_district',
    block:    'rgwcma:locationApi_block',
    gp:       'rgwcma:locationApi_grampanchayat',
    village:  'rgwcma:locationApi_village',
};

// Vite proxies /geoserver → http://localhost:8080/geoserver, eliminating CORS.
const WFS_BASE = '/geoserver/rgwcma/wfs';

const isNumeric = (v) => v != null && !Number.isNaN(Number(v)) && String(v).trim() !== '';

/**
 * Fetches a single boundary feature for map camera zooming.
 * Attempts fast GeoServer WFS fetch first; if GeoServer is unreachable or returns
 * an XML error/exception, seamlessly falls back to Django's boundary-by-code API.
 *
 * Priority: id → code → name (exact) → name (prefix)
 */
export const useSelectedBoundaryGeometry = (filters) => {
    const [boundary, setBoundary] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);

    // Determine which administrative level is active (most specific first)
    const activeLevel = filters?.village
        ? 'village'
        : filters?.gramPanchayat
            ? 'gp'
            : filters?.block
                ? 'block'
                : filters?.district
                    ? 'district'
                    : null;

    const activeName = filters?.village || filters?.gramPanchayat || filters?.block || filters?.district;
    const activeCode = filters?.vlgCode || filters?.villageCode || filters?.gpCode || filters?.blockCode || filters?.districtCode;
    const activeId   = filters?.vlgId || filters?.villageId || filters?.gpId || filters?.blockId || filters?.districtId;
    const selectionKey = `${activeLevel || 'none'}:${activeId || activeCode || activeName || ''}`;

    useEffect(() => {
        if (!activeLevel || !activeName) {
            setBoundary(null);
            setError(null);
            return;
        }

        const typeName = LAYER_MAP[activeLevel];
        if (!typeName) return;

        let ignore = false;
        const controller = new AbortController();

        const fetchBoundary = async () => {
            setLoading(true);
            setError(null);
            // Clear stale geometry immediately so the camera never zooms to a
            // previous level's bounding box while the new request is in flight.
            setBoundary(null);

            let feature = null;

            // ── Step 1: Attempt GeoServer WFS fetch ──────────────────────────
            try {
                const cqlParts = [];
                if (isNumeric(activeId)) cqlParts.push(`id = ${activeId}`);
                if (activeCode)          cqlParts.push(`code = '${String(activeCode).replace(/'/g, "''")}'`);
                const escapedName = activeName.replace(/'/g, "''");
                cqlParts.push(`name ILIKE '${escapedName}'`);
                cqlParts.push(`name ILIKE '${escapedName}%'`);

                const cqlFilter = cqlParts.join(' OR ');

                const url = `${WFS_BASE}?` + new URLSearchParams({
                    service:      'WFS',
                    version:      '1.1.0',
                    request:      'GetFeature',
                    typeName,
                    cql_filter:   cqlFilter,
                    outputFormat: 'application/json',
                    maxFeatures:  '1',
                });

                const res = await fetch(url, { signal: controller.signal });
                const contentType = res.headers.get('content-type') || '';

                // Only parse JSON if server responded with OK and JSON Content-Type
                if (res.ok && contentType.toLowerCase().includes('json')) {
                    const data = await res.json();
                    if (data?.features?.length > 0 && data.features[0]?.geometry) {
                        feature = data.features[0];
                    }
                }
            } catch (err) {
                // AbortError is intentional
                if (controller.signal.aborted || ignore) return;
                // Non-fatal: will try backend fallback below
            }

            // ── Step 2: Fallback to Django Location API if WFS didn't yield geometry ─
            if (!feature && !controller.signal.aborted && !ignore) {
                try {
                    const params = {
                        layer: activeLevel,
                        meta_only: 'false'
                    };
                    if (activeCode) params.code = activeCode;
                    if (isNumeric(activeId)) params.id = activeId;
                    if (activeName) params.name = activeName;

                    const backendRes = await api.location.getBoundaryByCode(params, controller.signal);
                    if (backendRes && (backendRes.geometry || backendRes.type === 'Feature')) {
                        feature = backendRes;
                    }
                } catch (fallbackErr) {
                    if (controller.signal.aborted || ignore) return;
                }
            }

            if (ignore || controller.signal.aborted) return;

            if (feature && feature.geometry) {
                setBoundary({ ...feature, __selectionKey: selectionKey });
                setError(null);
            } else {
                setError(`No ${activeLevel} boundary found for "${activeName}"`);
            }
            setLoading(false);
        };

        fetchBoundary();
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [activeLevel, activeName, activeId, activeCode, selectionKey]);

    return { boundary, loading, error };
};
