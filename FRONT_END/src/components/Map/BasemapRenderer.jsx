import React, { useMemo } from 'react';
import { TileLayer } from 'react-leaflet';

const BasemapRenderer = ({ basemap }) => {
    const basemapContent = useMemo(() => {
        const url = basemap === 'imagery-labels' || basemap === 'imagery'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : basemap === 'streets'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

        return (
            <>
                <TileLayer url={url} attribution='Tiles &copy; Esri' />
                {basemap === 'imagery-labels' && (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        zIndex={10}
                    />
                )}
            </>
        );
    }, [basemap]);

    return basemapContent;
};

export default React.memo(BasemapRenderer);
