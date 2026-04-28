import { useCallback } from 'react';

export const useMapControls = (map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden) => {
    const handleResetView = useCallback(() => {
        if (!map) return;
        map.fitBounds([
            [23.03, 69.30], // Southwest
            [30.22, 78.27]  // Northeast
        ], {
            paddingTopLeft: [isControlsSidebarCollapsed ? 10 : 330, 20],
            paddingBottomRight: [isDataAnalysisSidebarHidden ? 10 : 350, 20],
            animate: true,
            duration: 0.8
        });
    }, [map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden]);

    const handleZoomIn = useCallback(() => map?.zoomIn(), [map]);
    const handleZoomOut = useCallback(() => map?.zoomOut(), [map]);

    const handleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    return {
        handleResetView,
        handleZoomIn,
        handleZoomOut,
        handleFullscreen
    };
};
