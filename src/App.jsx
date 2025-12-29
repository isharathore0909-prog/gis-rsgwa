import React, { useState } from 'react';
import Header from './components/Header';
import ControlsSidebar from './components/ControlsSidebar';
import DataAnalysisSidebar from './components/DataAnalysisSidebar';
import MapView from './components/MapView';
import './App.css';

function App() {
    const [layers, setLayers] = useState({
        wells: true,
        contours: false,
        quality: false,
        satellite: false
    });
    const [selectedWell, setSelectedWell] = useState(null);
    const [filters, setFilters] = useState(null);
    const [basemap, setBasemap] = useState('osm');
    const [clickedLocation, setClickedLocation] = useState(null);
    const [neighbors, setNeighbors] = useState([]);

    const handleLayerChange = (layerName, checked) => {
        setLayers(prev => ({
            ...prev,
            [layerName]: checked
        }));
    };

    const handleFiltersApply = (appliedFilters) => {
        setFilters(appliedFilters);
        // Here you would typically filter the data based on filters
        console.log('Filters applied:', appliedFilters);
    };

    const handleBasemapChange = (selectedBasemap) => {
        setBasemap(selectedBasemap);
        // Update layers state for satellite basemap
        if (selectedBasemap === 'satellite') {
            setLayers(prev => ({ ...prev, satellite: true }));
        } else {
            setLayers(prev => ({ ...prev, satellite: false }));
        }
    };

    return (
        <div className="app-container">
            <Header />
            
            <div className="main-layout">
                <ControlsSidebar
                    layers={layers}
                    onLayerChange={handleLayerChange}
                    onFiltersApply={handleFiltersApply}
                    onBasemapChange={handleBasemapChange}
                />
                
                <MapView
                    layers={layers}
                    basemap={basemap}
                    filters={filters}
                    onWellSelect={setSelectedWell}
                    selectedWell={selectedWell}
                    onLocationClick={(location, neighbors) => {
                        setClickedLocation(location);
                        setNeighbors(neighbors);
                    }}
                />
                
                <DataAnalysisSidebar 
                    clickedLocation={clickedLocation}
                    neighbors={neighbors}
                />
            </div>
        </div>
    );
}

export default App;

