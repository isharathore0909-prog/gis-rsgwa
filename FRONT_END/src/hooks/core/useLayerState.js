import { useState, useCallback, useEffect } from 'react';

/**
 * Manages layer-specific interactive state (tables, selections, markers)
 */
export const useLayerState = (filters) => {
    const [selectedWell, setSelectedWell] = useState(null);
    const [selectedDams, setSelectedDams] = useState([]);
    const [tableSelection, setTableSelection] = useState([]);
    const [selectedWellInventory, setSelectedWellInventory] = useState([]);
    const [searchCoordinates, setSearchCoordinates] = useState(null);

    const handleCoordinateSearch = useCallback((lat, lng) => {
        if (lat && lng) {
            setSearchCoordinates({ lat, lng, timestamp: Date.now() });
        }
    }, []);

    const handleAddToTable = useCallback((dam) => {
        setSelectedDams(prev => {
            const damId = `${dam.name}-${dam.district}`;
            if (prev.some(item => item.id === damId)) return prev;
            const feature = {
                id: damId,
                type: 'Feature',
                properties: {
                    Name: dam.name,
                    District: dam.district,
                    Block: dam.block,
                    River: dam.river,
                    Basin: dam.basin,
                    Type: dam.type,
                    Length: dam.length ? `${dam.length}m` : 'N/A',
                    Height: dam.max_height ? `${dam.max_height}m` : 'N/A',
                    Year: dam.completion_year || 'N/A'
                }
            };
            return [...prev, feature];
        });
    }, []);

    const handleRemoveRow = useCallback((id) => {
        setSelectedDams(prev => prev.filter(item => item.id !== id));
        setTableSelection(prev => prev.filter(itemId => itemId !== id));
    }, []);

    const handleToggleSelection = useCallback((id, data) => {
        if (id === 'all') {
            if (!data || !data.features) return;
            const allIds = data.features.map(f => f.id);
            setTableSelection(prev => (prev.length === allIds.length && allIds.length > 0) ? [] : allIds);
        } else if (Array.isArray(id)) {
            setTableSelection(prev => {
                const someNotSelected = id.some(itemId => !prev.includes(itemId));
                if (someNotSelected) {
                    const next = [...prev];
                    id.forEach(itemId => { if (!next.includes(itemId)) next.push(itemId); });
                    return next;
                } else {
                    return prev.filter(itemId => !id.includes(itemId));
                }
            });
        } else {
            setTableSelection(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
        }
    }, []);

    const handleToggleWellInventory = useCallback((well) => {
        if (!well) return;
        setSelectedWellInventory(prev => {
            const getLoc = (w) => ({
                id: w.well_id || w.id,
                lat: parseFloat(w.latitude || w.lat || 0),
                lng: parseFloat(w.longitude || w.lng || 0)
            });
            const target = getLoc(well);
            const exists = prev.find(w => {
                const loc = getLoc(w);
                const idMatch = target.id && loc.id && target.id === loc.id;
                const locMatch = target.lat && target.lng && loc.lat && loc.lng &&
                    Math.abs(target.lat - loc.lat) < 0.0001 && Math.abs(target.lng - loc.lng) < 0.0001;
                return idMatch || locMatch;
            });
            if (exists) {
                return prev.filter(w => {
                    const loc = getLoc(w);
                    const idMatch = target.id && loc.id && target.id === loc.id;
                    const locMatch = target.lat && target.lng && loc.lat && loc.lng &&
                        Math.abs(target.lat - loc.lat) < 0.0001 && Math.abs(target.lng - loc.lng) < 0.0001;
                    return !(idMatch || locMatch);
                });
            }
            return [...prev, well];
        });
    }, []);

    const handleClearWellInventory = useCallback(() => setSelectedWellInventory([]), []);

    const handleSetWellInventory = useCallback((well) => {
        if (!well) return;
        setSelectedWellInventory([well]);
    }, []);

    useEffect(() => {
        setTableSelection([]);
        setSelectedWellInventory([]);
        setSelectedWell(null);
    }, [filters?.type, filters?.district, filters?.block, filters?.gramPanchayat, filters?.village]);


    return {
        selectedWell, setSelectedWell,
        selectedDams, setSelectedDams,
        tableSelection, setTableSelection,
        selectedWellInventory, setSelectedWellInventory,
        searchCoordinates,
        handleCoordinateSearch,
        handleAddToTable,
        handleRemoveRow,
        handleToggleSelection,
        handleToggleWellInventory,
        handleClearWellInventory,
        handleSetWellInventory
    };
};
