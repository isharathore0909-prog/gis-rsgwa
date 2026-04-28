import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
    // 1. Core State
    const [fontSize, setFontSize] = useState('normal');
    const [theme, setTheme] = useState('light');

    // 2. Global Filters (Lifted from useAppLogic)
    const [filters, setFilters] = useState({
        type: '',
        source: 'Rajasthan GW',
        district: '',
        districtId: null,
        districtCode: null,
        block: '',
        blockId: null,
        blockCode: null,
        gramPanchayat: '',
        gpId: null,
        gpCode: null,
        village: '',
        timestep: 'Monthly',
        dataRangeStart: '',
        dataRangeEnd: '',
        stationType: 'All',
        showRaingaugeStations: false,
        showPiezometers: false,
        showDams: false,
        showCanals: false,
        showWaterbodies: false,
        showMicro: false,
        showRecharge: false,
        showEC: false,

        showNitrate: false,
        showFluoride: false,
        showTDS: false,
        showPH: false,
        showMarkers: true,
        legendFeature: 'Category'
    });

    // 3. Global Layers Visibility
    const [layers, setLayers] = useState({
        wells: true,
        contours: false,
        quality: false,
        satellite: false,
        blockBoundary: false
    });

    // 4. Shared Map State
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'gis'
    const [basemap, setBasemap] = useState('light-gray');
    const [clickedLocation, setClickedLocation] = useState(null);
    const [isControlsSidebarCollapsed, setIsControlsSidebarCollapsed] = useState(false);
    const [map, setMap] = useState(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // --- URL Routing Utils ---
    const TYPE_SLUGS = useMemo(() => ({
        'Aquifer': 'aquifer',
        'Ground Water Resource Estimation': 'gwre',
        'Rainfall': 'rainfall',
        'Recharge Structure': 'recharge-structure',
        'Water Quality': 'water-quality',
        'Water Resources': 'water-resources',
        'Well Inventory': 'well-inventory',
    }), []);

    const SLUG_TO_TYPE = useMemo(() =>
        Object.fromEntries(Object.entries(TYPE_SLUGS).map(([type, slug]) => [slug, type])),
        [TYPE_SLUGS]);

    // Update URL when filters.type changes
    useEffect(() => {
        const currentPath = window.location.pathname.replace(/^\//, '');
        const targetSlug = TYPE_SLUGS[filters.type] || '';

        if (targetSlug && currentPath !== targetSlug) {
            window.history.pushState(null, '', `/${targetSlug}`);
        } else if (!targetSlug && currentPath !== '' && currentPath !== 'index.html') {
            // Optional: reset to root if no type selected
            // window.history.pushState(null, '', '/');
        }
    }, [filters.type, TYPE_SLUGS]);

    // Handle initial load and back/forward browser buttons
    useEffect(() => {
        const handleLocationChange = () => {
            const path = window.location.pathname.replace(/^\//, '');
            const targetType = SLUG_TO_TYPE[path] || '';
            if (targetType && filters.type !== targetType) {
                const isWR = targetType === 'Water Resources';
                const isWQ = targetType === 'Water Quality';
                setFilters(prev => ({
                    ...prev,
                    type: targetType,
                    legendFeature: isWR ? 'Category' : (isWQ ? 'status' : (targetType === 'Rainfall' ? 'avg_rainfall' : 'Category')),
                    showDams: isWR,
                    showCanals: false,
                    showWaterbodies: false,
                    showMicro: false,
                    showMarkers: isWR || isWQ,
                    showEC: isWQ,
                    showTDS: false,
                    showFluoride: false,
                    showPH: false
                }));
            }
        };

        // Parse initial URL
        handleLocationChange();

        // Listen for popstate
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, [SLUG_TO_TYPE]); // Only run once on mount (filters.type is updated inside)

    // Helpers
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const toggleLayer = useCallback((layerName, checked) => {
        setLayers(prev => ({ ...prev, [layerName]: checked }));
    }, []);

    const value = useMemo(() => ({
        fontSize, setFontSize,
        theme, setTheme,
        viewMode, setViewMode,
        filters, setFilters, updateFilters,
        layers, setLayers, toggleLayer,
        basemap, setBasemap,
        clickedLocation, setClickedLocation,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed,
        map, setMap,
        showColorPicker, setShowColorPicker
    }), [fontSize, theme, viewMode, filters, updateFilters, layers, toggleLayer, basemap, clickedLocation, isControlsSidebarCollapsed, map, showColorPicker]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};
