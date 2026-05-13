import React from 'react';
import Spinner from './ChartSpinner';

/**
 * ChartLoader
 * 
 * A reusable wrapper that overlays a premium iOS-style spinner 
 * over its children when isLoading is true.
 */
const ChartLoader = ({ isLoading, children, size = 40, color = "#3b82f6", minHeight = "200px", height, borderRadius = "12px" }) => {
    const containerStyle = {
        position: 'relative',
        width: '100%',
        minHeight,
        height: height || 'auto',
        borderRadius
    };

    return (
        <div style={containerStyle}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: borderRadius,
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <Spinner size={size} color={color} />
                </div>
            )}
            {children}
        </div>
    );
};

export default ChartLoader;
