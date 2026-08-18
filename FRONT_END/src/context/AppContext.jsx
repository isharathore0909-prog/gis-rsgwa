import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const AppContext = createContext();

const URL_SLUGS = {
    'gwre': 'Ground Water Resource Estimation',
    'rainfall': 'Rainfall',
    'water-quality': 'Water Quality',
    'water_quality': 'Water Quality',
    'water-level': 'Well Inventory',
    'water_level': 'Well Inventory',
    'well-inventory': 'Well Inventory',
    'water-resources': 'Water Resources',
    'water_resources': 'Water Resources',
    'recharge-structure': 'Recharge Structure',
    'aquifer': 'Aquifer'
};

const getInitialTypeFromUrl = () => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    return URL_SLUGS[path] || '';
};

export const AppContextProvider = ({ children }) => {
    // 1. Core State
    const [fontSize, setFontSize] = useState('normal');
    const [theme, setTheme] = useState('light');

    // 2. Global Filters (Lifted from useAppLogic)
    const [filters, setFilters] = useState(() => {
        const initialType = getInitialTypeFromUrl();
        const isWR = initialType === 'Water Resources';
        const isWQ = initialType === 'Water Quality';
        return {
            type: initialType,
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
            showDams: isWR,
            showCanals: false,
            showWaterbodies: false,
            showMicro: false,
            showRecharge: false,
            showEC: isWQ,
            showNitrate: false,
            showFluoride: false,
            showTDS: false,
            showPH: false,
            showMarkers: isWR || isWQ,
            legendFeature: isWR ? 'Category' : (isWQ ? 'status' : (initialType === 'Rainfall' ? 'avg_rainfall' : 'Category'))
        };
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
        'Well Inventory': 'water-level',
    }), []);

    const SLUG_TO_TYPE = useMemo(() => URL_SLUGS, []);

    // Update URL when filters.type changes
    useEffect(() => {
        const currentPath = window.location.pathname.replace(/^\//, '').toLowerCase();
        const targetSlug = TYPE_SLUGS[filters.type] || '';

        // Avoid re-pushing if already at a valid alias (e.g. well-inventory or water_level)
        const isCurrentPathMatchingType = URL_SLUGS[currentPath] === filters.type;

        if (targetSlug && !isCurrentPathMatchingType && currentPath !== targetSlug) {
            window.history.pushState(null, '', `/${targetSlug}`);
        } else if (!targetSlug && currentPath !== '' && currentPath !== 'index.html' && URL_SLUGS[currentPath]) {
            // Reset to root if type was cleared while on a metric URL
            window.history.pushState(null, '', '/');
        }
    }, [filters.type, TYPE_SLUGS]);

    // Handle initial load and back/forward browser buttons
    useEffect(() => {
        const handleLocationChange = () => {
            const path = window.location.pathname.replace(/^\//, '').toLowerCase();
            const targetType = SLUG_TO_TYPE[path] || '';
            if (filters.type !== targetType) {
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

        // Listen for popstate
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, [SLUG_TO_TYPE, filters.type]);

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
