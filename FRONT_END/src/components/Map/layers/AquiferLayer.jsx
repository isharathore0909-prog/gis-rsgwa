import React from 'react';
import VectorGridSlicer from '../VectorGridSlicer';
import { BACKEND_API, buildBackendUrl } from '../../../api/config';

export const AquiferVectorLayer = ({
    isActive,
    district,
    filter,
    style,
    onFeatureClick,
    onLoading,
    data
}) => {
    if (!isActive) return null;

    const dataUrl = district
        ? buildBackendUrl(BACKEND_API.ENDPOINTS.SPATIAL_LAYERS_INTERSECT, {
            layer_type: 'aquifer',
            district
        })
        : '/data/aquifer_opt.json';

    return (
        <VectorGridSlicer
            key={`aquifer-${district || 'all'}-${data ? 'custom' : 'url'}`}
            active={isActive}
            data={data}
            dataUrl={data ? null : dataUrl}
            layerName="aquifer"
            filter={data ? null : filter} // Don't filter again if it's pre-filtered
            style={style}
            onFeatureClick={onFeatureClick}
            onLoading={onLoading}
        />
    );
};
