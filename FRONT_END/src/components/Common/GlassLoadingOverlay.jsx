import React from 'react';
import './GlassLoadingOverlay.css';

/**
 * A premium glassmorphism loading overlay for Map and Sidebar components.
 * 
 * @param {string} message - Main loading message (e.g., "Loading Layer Data...")
 * @param {string} subtext - Specific details (e.g., "Fetching spatial information for Rainfall")
 * @param {boolean} fullScreen - Whether it should cover the entire parent container
 */
const GlassLoadingOverlay = ({
    message = "Loading Data...",
    subtext = "Please wait while we prepare the visualization",
    fullScreen = true
}) => {
    return (
        <div className={`glass-loading-overlay ${fullScreen ? 'full-screen' : ''}`}>
            <div className="glass-loading-card">
                <div className="glass-spinner-container">
                    <div className="glass-spinner-outer"></div>
                    <div className="glass-spinner-inner"></div>
                </div>
            </div>
        </div>
    );
};

export default GlassLoadingOverlay;
