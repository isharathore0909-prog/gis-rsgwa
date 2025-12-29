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
    const [timePeriod, setTimePeriod] = useState('2024');
    const [parameter, setParameter] = useState('water-level');
    const [selectedWell, setSelectedWell] = useState(null);

    const handleLayerChange = (layerName, checked) => {
        setLayers(prev => ({
            ...prev,
            [layerName]: checked
        }));
    };

    return (
        <div className="app-container">
            <Header />
            
            <div className="main-layout">
                <ControlsSidebar
                    layers={layers}
                    onLayerChange={handleLayerChange}
                    timePeriod={timePeriod}
                    onTimePeriodChange={setTimePeriod}
                    parameter={parameter}
                    onParameterChange={setParameter}
                />
                
                <MapView
                    layers={layers}
                    basemap={layers.satellite ? 'satellite' : 'osm'}
                    onWellSelect={setSelectedWell}
                    selectedWell={selectedWell}
                />
                
                <DataAnalysisSidebar />
            </div>
        </div>
    );
}

export default App;

