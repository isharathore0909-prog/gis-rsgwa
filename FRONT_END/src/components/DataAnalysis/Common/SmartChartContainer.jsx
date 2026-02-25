import React, { useRef, useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * SmartChartContainer
 * 
 * A wrapper for Recharts that only renders the ResponsiveContainer
 * when the parent container has actual physical dimensions.
 * This prevents the "width(-1) and height(-1)" console warnings.
 */
const SmartChartContainer = ({ children, height, width = '100%', className = '' }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });

        observer.observe(containerRef.current);
        updateDimensions();

        return () => {
            observer.disconnect();
            setIsMounted(false);
        };
    }, []);

    // Only render if mounted AND we have actual positive dimensions
    // Recharts ResponsiveContainer often throws warnings if width/height are <= 0
    const shouldRender = isMounted && dimensions.width > 0 && dimensions.height > 0;

    return (
        <div
            ref={containerRef}
            className={`smart-chart-container ${className}`}
            style={{
                height: height || '300px',
                width: width,
                position: 'relative',
                overflow: 'visible', // Changed to visible so tooltips can escape
                minHeight: height && height.includes('px') ? height : '0px',
                minWidth: 0
            }}
        >
            {shouldRender ? (
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                    debounce={50}
                >
                    {children}
                </ResponsiveContainer>
            ) : (
                <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Placeholder */}
                </div>
            )}
        </div>
    );
};

export default SmartChartContainer;
