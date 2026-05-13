import React from 'react';
import { WMSTileLayer } from 'react-leaflet';
import { GEOSERVER_CONFIG } from '../../../api/config';

/**
 * Water Quality Contour Layer (WMS-Based)
 * Dynamically passes the corresponding SLD style to GeoServer based on the selected parameter.
 */
const WaterQualityContourLayer = ({
    isActive,
    parameter, // 'ec', 'nitrate', 'fluoride', 'tds', 'ph'
    filters,    // To get selected GP/Block/District
    label,
    onLoading
}) => {
    // Safely update loading state in parent without rendering conflict
    React.useEffect(() => {
        if ((!isActive || !parameter) && onLoading) {
            onLoading(false);
        }
    }, [isActive, parameter, onLoading]);

    // If not active, render nothing
    if (!isActive || !parameter) {
        return null;
    }

    // Tell GeoServer exactly which style to use
    const styleName = `wq_contours_style`;

    // Dynamic SQL View params for drill-down clipping
    const viewParams = [
        `parameter:${parameter}`,
        `dist_id:${filters?.districtId || filters?.district_id || -1}`,
        `block_id:${filters?.blockId || filters?.block_id || -1}`,
        `gp_id:${filters?.gpId || filters?.gp_code || -1}`
    ].join(';');

    return (
        <WMSTileLayer
            key={`wq-contour-${parameter}-${viewParams}`}
            url={`${GEOSERVER_CONFIG.BASE_URL}/rgwcma/wms`}
            layers="rgwcma:wq_dynamic_contours"
            format="image/png"
            transparent={true}
            version="1.1.1"
            styles={styleName}
            viewparams={viewParams}
            zIndex={100}
            eventHandlers={{
                loading: () => { if (onLoading) onLoading(true); },
                load: () => { if (onLoading) onLoading(false); },
                error: () => { if (onLoading) onLoading(false); }
            }}
        />
    );
};

export default WaterQualityContourLayer;
