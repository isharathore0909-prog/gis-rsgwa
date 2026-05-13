import React, { useRef, useState, useEffect } from 'react';
import Spinner from '../../Common/ChartSpinner';
import ChartLoader from '../../Common/ChartLoader';

/**
 * SmartChartContainer
 * 
 * A wrapper for charts that ensures the parent container has actual dimensions.
 */
const SmartChartContainer = ({ children, height, width = '100%', className = '', isLoading = false }) => {
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

    const shouldRender = isMounted && dimensions.width > 0 && dimensions.height > 0;

    return (
        <div
            ref={containerRef}
            className={`smart-chart-container ${className}`}
            style={{
                height: height || '300px',
                width: width,
                position: 'relative',
                overflow: 'visible',
                minHeight: height && height.includes('px') ? height : '0px',
                minWidth: 0
            }}
        >
            <ChartLoader isLoading={isLoading} minHeight="100%" size={32}>
                {shouldRender ? (
                    <div style={{ width: '100%', height: '100%' }}>
                        {children}
                    </div>
                ) : (
                    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spinner size={32} />
                    </div>
                )}
            </ChartLoader>
        </div>
    );
};

export default SmartChartContainer;
