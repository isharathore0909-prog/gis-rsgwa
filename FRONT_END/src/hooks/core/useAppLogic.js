import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useFilterState } from './useFilterState';
import { useLayerState } from './useLayerState';
import { useDataLoading } from './useDataLoading';

/**
 * Facade hook that composes the core state modules to provide a 
 * unified interface for App.jsx, keeping responsibilities cleanly separated.
 */
export const useAppLogic = () => {
    const context = useAppContext();
    const [neighbors, setNeighbors] = useState([]);

    const filterState = useFilterState(context, setNeighbors);
    const layerState = useLayerState(context.filters);
    const dataLoadingState = useDataLoading(context.filters, neighbors);

    // Merge context along with the 3 distinct core state hooks
    return useMemo(() => ({
        ...context,
        neighbors, setNeighbors,
        ...filterState,
        ...layerState,
        ...dataLoadingState
    }), [context, neighbors, filterState, layerState, dataLoadingState]);
};
