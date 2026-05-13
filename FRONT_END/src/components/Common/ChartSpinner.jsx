import React from 'react';
import './ChartSpinner.css';

const Spinner = ({ size = 40, color = "#64748b" }) => {
    return (
        <div
            className="ios-spinner"
            style={{
                width: size,
                height: size
            }}
        >
            {[...Array(12)].map((_, i) => (
                <div key={i} style={{ background: color }}></div>
            ))}
        </div>
    );
};

export default Spinner;
