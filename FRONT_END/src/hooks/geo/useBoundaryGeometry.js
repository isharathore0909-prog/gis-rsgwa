import { useState, useEffect } from 'react';

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
 * Fetches a single boundary feature from GeoServer WFS for map camera zooming.
 * Uses the same GeoServer instance that already renders WMS tile layers —
 * no Django middleman needed.
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

            // Build CQL filter — most specific condition first so GeoServer
            // short-circuits on the id match without scanning by name.
            const cqlParts = [];
            if (isNumeric(activeId))  cqlParts.push(`id = ${activeId}`);
            if (activeCode)           cqlParts.push(`code = '${String(activeCode).replace(/'/g, "''")}'`);
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
                // GeoServer exposes this field as `geometry` (not `the_geom`).
                // Asking for the wrong field returns an XML exception, leaving
                // the camera with no boundary to fit.
                propertyName: 'geometry',
            });

            try {
                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error(`GeoServer WFS returned ${res.status}`);

                const data = await res.json();
                if (ignore) return;

                if (data?.features?.length > 0) {
                    // Keep the selection identity with the feature.  The map
                    // can then reject a previous block's geometry while a GP or
                    // village request is still resolving.
                    setBoundary({ ...data.features[0], __selectionKey: selectionKey });
                } else {
                    setError(`No ${activeLevel} boundary found for "${activeName}"`);
                }
            } catch (err) {
                if (controller.signal.aborted || ignore) return;
                console.warn('[useBoundaryGeometry] WFS fetch failed:', err.message);
                setError(`Boundary unavailable for "${activeName}"`);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchBoundary();
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [activeLevel, activeName, activeId, activeCode, selectionKey]);

    return { boundary, loading, error };
};
