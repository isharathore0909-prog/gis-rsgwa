import { useState, useEffect, useCallback, useRef } from 'react';
import mapLayers from '../../data/mapLayers.json';
import pageCategories from '../../data/pageCategories.json';

/**
 * Manages filter state, category parsing, and URL configurations
 */
export const useFilterState = (context, setNeighbors) => {
    const { filters, setFilters, setLayers, setBasemap, setClickedLocation } = context;

    const [activeUrlLayers, setActiveUrlLayers] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [isProceedClicked, setIsProceedClicked] = useState(false);

    const handleLayerChange = useCallback((layerName, checked) => {
        setLayers(prev => ({ ...prev, [layerName]: checked }));
    }, [setLayers]);

    const handleFiltersApply = useCallback((appliedFilters) => {
        setFilters(appliedFilters);
        setIsProceedClicked(true);
    }, [setFilters]);

    const handleBasemapChange = useCallback((selectedBasemap) => {
        setBasemap(selectedBasemap);
    }, [setBasemap]);

    // URL Params Handling
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        let currentUrlLayers = [];

        const layerIdsParam = searchParams.get('layer_ids');
        if (layerIdsParam) {
            const ids = layerIdsParam.split(',').map(id => parseInt(id.trim(), 10));
            const selectedLayers = mapLayers.filter(layer => ids.includes(layer.id));
            setActiveUrlLayers(selectedLayers);
            currentUrlLayers = selectedLayers;
        }

        const typeIdParam = searchParams.get('type_id');
        if (typeIdParam) {
            const category = pageCategories.find(cat => cat.type_id === typeIdParam);
            if (category) {
                setActiveCategory(category);
                if (category.uiConfig?.defaultLayers) {
                    setLayers(prev => {
                        const newLayers = { ...prev };
                        Object.keys(newLayers).forEach(key => newLayers[key] = false);
                        category.uiConfig.defaultLayers.forEach(layerKey => {
                            if (newLayers.hasOwnProperty(layerKey)) newLayers[layerKey] = true;
                        });
                        return newLayers;
                    });
                }
                if (currentUrlLayers.some(l => l.id === 2)) {
                    setFilters(prev => ({
                        ...prev,
                        type: 'Ground Water Resource Estimation',
                        district: '',
                        block: '',
                        gramPanchayat: '',
                        village: ''
                    }));
                }
            }
        }
    }, [activeUrlLayers, setLayers, setFilters]);

    // Proactive Reset on Layer Change
    const prevTypeRef = useRef(filters?.type);
    useEffect(() => {
        if (filters?.type !== prevTypeRef.current) {
            setIsProceedClicked(false);
            setClickedLocation(null);
            if (setNeighbors) setNeighbors([]);
            prevTypeRef.current = filters?.type;
        }
    }, [filters?.type, setClickedLocation, setNeighbors]);

    // Cleanup effects on filter change
    useEffect(() => {
        setClickedLocation(null);
        if (setNeighbors) setNeighbors([]);
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village, setClickedLocation, setNeighbors]);

    return {
        activeUrlLayers,
        activeCategory,
        isProceedClicked,
        setIsProceedClicked,
        handleLayerChange,
        handleFiltersApply,
        handleBasemapChange
    };
};
