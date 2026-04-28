import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ message = "Loading..." }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
