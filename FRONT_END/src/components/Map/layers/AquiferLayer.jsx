import React from 'react';
import { WMSTileLayer } from 'react-leaflet';

export const AquiferVectorLayer = ({
    isActive,
    filters
}) => {
    // Render aquifers as high-performance WMS tiles
    if (!isActive) return null;

    const viewParams = React.useMemo(() => {
        // Helper to check if a value is a real selection and not a placeholder
        const isValid = (v) => v && (typeof v === 'string' || typeof v === 'number') &&
            v.toString().toLowerCase() !== 'all' &&
            !v.toString().toLowerCase().includes('select') &&
            v.toString().trim() !== '';

        if (isValid(filters?.blockCode)) {
            return `filter_clause:properties->>'BLOCK_CODE_2'='${filters.blockCode}'`;
        } else if (isValid(filters?.blockId)) {
            return `filter_clause:properties->>'block_id'='${filters.blockId}'`;
        } else if (isValid(filters?.block)) {
            return `filter_clause:properties->>'BLOCK_NAME_2' ILIKE '${filters.block.replace("'", "''")}'`;
        } else if (isValid(filters?.districtCode)) {
            return `filter_clause:properties->>'district_code'='${filters.districtCode}'`;
        } else if (isValid(filters?.districtId)) {
            return `filter_clause:properties->>'district_id'='${filters.districtId}'`;
        } else if (isValid(filters?.district)) {
            // Fallback to name-based filtering if codes are missing
            return `filter_clause:properties->>'DISTRICT_N_2' ILIKE '${filters.district.replace("'", "''")}'`;
        }

        // Default: Show all (State View)
        return 'filter_clause:1=1';
    }, [filters?.district, filters?.districtCode, filters?.districtId, filters?.block, filters?.blockCode, filters?.blockId]);

    return (
        <WMSTileLayer
            key={`aquifer-wms-${viewParams}`}
            url="http://localhost:8080/geoserver/rgwcma/wms"
            layers="rgwcma:aquifers_layer"
            format="image/png"
            transparent={true}
            zIndex={405}
            params={{
                viewparams: viewParams
            }}
        />
    );
};
