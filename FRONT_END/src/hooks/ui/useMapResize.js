import { useEffect } from 'react';

export const useMapResize = (map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden) => {
    useEffect(() => {
        if (!map) return;
        const observer = new ResizeObserver(() => {
            setTimeout(() => {
                try {
                    if (map && map._container && map._mapPane && typeof map.invalidateSize === 'function') {
                        map.invalidateSize(false);
                    }
                } catch (e) {
                    console.warn("Map resize observation failed", e);
                }
            }, 150);
        });

        try {
            if (map && typeof map.getContainer === 'function') {
                const container = map.getContainer();
                if (container) {
                    observer.observe(container);
                }
            }
        } catch (e) {
            console.warn("Map resize observation failed", e);
        }

        return () => observer.disconnect();
    }, [map]);

    useEffect(() => {
        if (map && map.getContainer()) {
            setTimeout(() => {
                try {
                    if (map && map.getContainer() && map._mapPane && typeof map.invalidateSize === 'function') {
                        map.invalidateSize(false);
                    }
                } catch (e) {
                    console.warn("Map explicit resize failed", e);
                }
            }, 300);
        }
    }, [map, isControlsSidebarCollapsed, isDataAnalysisSidebarHidden]);
};
