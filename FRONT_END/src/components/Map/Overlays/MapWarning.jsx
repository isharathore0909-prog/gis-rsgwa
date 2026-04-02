import GlassLoadingOverlay from '../../Common/GlassLoadingOverlay';

/**
 * Map Warning Overlay
 */
export const MapWarning = ({ layerType, isRainfallDataEmpty, isLoading }) => {
    const supportedLayers = [
        'Rainfall',
        'Water Resources',
        'Ground Water Resource Estimation',
        'Aquifer',
        'Water Quality',
        'Well Inventory',
        'Recharge Structure'
    ];

    if (isLoading) {
        return (
            <GlassLoadingOverlay
                message="Loading Layer Data..."
                subtext={`Fetching spatial information for ${layerType || 'Map'}`}
            />
        );
    }

    if (layerType === 'Rainfall' && (!supportedLayers.includes(layerType) || isRainfallDataEmpty)) {
        return (
            <div className="map-warning-overlay animated-fade-in" style={{ top: '10%' }}>
                <div className="warning-content">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-text">
                        <h3>No Data Available</h3>
                        <p>
                            Rainfall data is not available for this selection.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!layerType || supportedLayers.includes(layerType)) return null;

    return (
        <div className="map-warning-overlay animated-fade-in">
            <div className="warning-content">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                    <h3>Map Visualization Not Available</h3>
                    <p>
                        Spatial data for <strong>{layerType}</strong> is currently being processed.
                    </p>
                </div>
            </div>
        </div>
    );
};
