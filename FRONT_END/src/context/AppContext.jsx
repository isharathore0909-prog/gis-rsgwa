import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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
        block: '',
        gramPanchayat: '',
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
        showMicro: false
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
    const [basemap, setBasemap] = useState('light-gray');
    const [clickedLocation, setClickedLocation] = useState(null);
    const [isControlsSidebarCollapsed, setIsControlsSidebarCollapsed] = useState(false);

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
        filters, setFilters, updateFilters,
        layers, setLayers, toggleLayer,
        basemap, setBasemap,
        clickedLocation, setClickedLocation,
        isControlsSidebarCollapsed, setIsControlsSidebarCollapsed
    }), [fontSize, theme, filters, updateFilters, layers, toggleLayer, basemap, clickedLocation, isControlsSidebarCollapsed]);

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
