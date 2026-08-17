import { useState, useEffect } from 'react';
import { GEOSERVER_CONFIG } from '../../api/config';
import api from '../../api';

/**
 * Custom hook to fetch boundary geometry directly from GeoServer WFS for map camera zooming.
 * 100% GeoServer WFS approach — no database or local static GeoJSON.
 */
export const useSelectedBoundaryGeometry = (filters) => {
    const [boundary, setBoundary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const activeLevel = filters?.village
        ? 'village'
        : (filters?.gramPanchayat
            ? 'gp'
            : (filters?.block
                ? 'block'
                : (filters?.district ? 'district' : null)));

    const activeName = filters?.village || filters?.gramPanchayat || filters?.block || filters?.district;
    const activeCode = filters?.vlgCode || filters?.gpCode || filters?.blockCode || filters?.districtCode;
    const activeId = filters?.vlgId || filters?.gpId || filters?.blockId || filters?.districtId;
    const isNumeric = (value) => value != null && !Number.isNaN(Number(value)) && String(value).trim() !== '';

    useEffect(() => {
        if (!activeLevel || !activeName) {
            setBoundary(null);
            setError(null);
            return;
        }

        let ignore = false;
        const controller = new AbortController();
        const fetchGeoServerWfsBoundary = async () => {
            setLoading(true);
            setError(null);
            // Never retain the previous level's geometry while a new selection is
            // resolving; otherwise the camera can fit the old district after a
            // block was chosen.
            setBoundary(null);

            const boundaryParams = { layer: activeLevel, name: activeName };
            if (activeCode) boundaryParams.code = activeCode;
            if (isNumeric(activeId)) boundaryParams.id = activeId;

            try {
                // The backend returns the database geometry normalized to WGS84.
                // It is more reliable for camera fitting than a cross-origin WFS
                // request, while the WMS layer continues to render the boundary.
                const boundaryData = await api.location.getBoundaryByCode(boundaryParams, controller.signal);
                if (controller.signal.aborted || ignore) return;
                if (boundaryData?.geometry) {
                    setBoundary(boundaryData);
                    setLoading(false);
                    return;
                }
            } catch (backendError) {
                if (controller.signal.aborted || ignore) return;
                console.warn('[useSelectedBoundaryGeometry] Boundary API fallback:', backendError.message);
            }

            const layerMap = {
                'district': 'rgwcma:locationApi_district',
                'block': 'rgwcma:locationApi_block',
                'gp': 'rgwcma:locationApi_grampanchayat',
                'village': 'rgwcma:locationApi_village'
            };

            const typeName = layerMap[activeLevel];
            if (!typeName) {
                if (!ignore) setLoading(false);
                return;
            }

            const escapedName = activeName.replace(/'/g, "''");
            const escapedCode = activeCode ? String(activeCode).replace(/'/g, "''") : null;

            const cqlConditions = [`name ILIKE '${escapedName}'`, `name ILIKE '${escapedName}%'`];
            if (escapedCode) cqlConditions.push(`code = '${escapedCode}'`);
            if (isNumeric(activeId)) cqlConditions.push(`id = ${activeId}`);

            const cqlFilter = `(${cqlConditions.join(' OR ')})`;

            const wfsUrl = `${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wfs?` + new URLSearchParams({
                service: 'WFS',
                version: '1.1.0',
                request: 'GetFeature',
                typeName: typeName,
                cql_filter: cqlFilter,
                outputFormat: 'application/json',
                maxFeatures: '1'
            }).toString();

            try {
                const res = await fetch(wfsUrl, { signal: controller.signal });
                if (!res.ok) throw new Error(`GeoServer WFS status ${res.status}`);
                const data = await res.json();
                if (!ignore && data && data.features && data.features.length > 0) {
                    setBoundary(data.features[0]);
                } else if (!ignore) {
                    setError(`No ${activeLevel} boundary found for ${activeName}`);
                }
            } catch (err) {
                if (controller.signal.aborted || ignore) return;
                console.warn('[useSelectedBoundaryGeometry] GeoServer WFS fallback unavailable:', err.message);
                if (!ignore) setError(`Boundary geometry unavailable for ${activeName}`);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchGeoServerWfsBoundary();
        return () => {
            ignore = true;
            controller.abort();
        };
    }, [activeLevel, activeName, activeId, activeCode, filters?.district]);

    return { boundary, loading, error };
};
