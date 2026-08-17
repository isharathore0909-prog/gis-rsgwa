import React from 'react';
import './ChartSpinner.css';

/**
 * ChartSpinner
 * Smooth SVG ring spinner matching AP WRIMS circular loader style.
 */
const Spinner = ({ size = 36, color = "#0284c7" }) => {
    return (
        <svg
            className="apwrims-svg-spinner"
            width={size}
            height={size}
            viewBox="0 0 50 50"
        >
            <circle
                className="path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke={color}
                strokeWidth="4.5"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default Spinner;
