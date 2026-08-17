import React from 'react';
import Spinner from './ChartSpinner';
import './GlassLoadingOverlay.css';

/**
 * GlassLoadingOverlay
 * A clean glassmorphism loading overlay using the unified Spinner component.
 */
const GlassLoadingOverlay = ({
    message = "Loading...",
    fullScreen = true
}) => {
    return (
        <div className={`glass-loading-overlay ${fullScreen ? 'full-screen' : ''}`}>
            <div className="glass-loading-card">
                <Spinner size={36} color="#0284c7" />
                {message && <span className="glass-loading-message">{message}</span>}
            </div>
        </div>
    );
};

export default GlassLoadingOverlay;
