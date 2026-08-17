import React from 'react';
import CardInlineLoader from './CardInlineLoader';

/**
 * ChartLoader
 * 
 * Reusable loader wrapper that renders an inline AP WRIMS style loader during fetch,
 * and renders children cleanly without collapsing when loaded.
 */
const ChartLoader = ({ isLoading, children, size = 40, color = "#0284c7", minHeight = "200px", height = "100%", borderRadius = "12px", message = "Loading chart data..." }) => {
    const containerStyle = {
        position: 'relative',
        width: '100%',
        height: height || '100%',
        minHeight: minHeight || '200px',
        borderRadius
    };

    if (isLoading) {
        return (
            <div style={{
                ...containerStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff'
            }}>
                <CardInlineLoader message={message} color={color} />
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {children}
        </div>
    );
};

export default ChartLoader;
