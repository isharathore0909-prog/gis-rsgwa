import React from 'react';
import { BASEMAPS } from '../../constants/uiOptions';

const BasemapSelector = ({ currentBasemap, handleBasemapSelect }) => {
    return (
        <div className="basemap-grid">
            {BASEMAPS.map(b => (
                <div
                    key={b.id}
                    className={`basemap-option ${currentBasemap === b.id ? 'active' : ''}`}
                    onClick={() => handleBasemapSelect(b.id)}
                >
                    <img src={b.thumbnail} alt={b.name} className="basemap-thumbnail" />
                    <span className="basemap-name">{b.name}</span>
                </div>
            ))}
        </div>
    );
};

export default BasemapSelector;
