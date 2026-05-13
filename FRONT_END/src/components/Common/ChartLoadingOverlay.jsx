import React from 'react';
import Spinner from './ChartSpinner';
import './ChartLoadingOverlay.css';

const ChartLoadingOverlay = ({ message = "Loading...", size = 40, color = "#64748b" }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-spinner-container">
                <Spinner size={size} color={color} />
                <p>{message}</p>
            </div>
        </div>
    );
};

export default ChartLoadingOverlay;
