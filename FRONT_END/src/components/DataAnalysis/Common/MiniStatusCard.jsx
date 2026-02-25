import React from 'react';

const MiniStatusCard = ({ value, label, color, style, className = '' }) => {
    return (
        <div className={`status-mini-card ${className}`} style={{ borderLeftColor: color, ...style }}>
            <div className="mini-val">{value}</div>
            <div className="mini-label">{label}</div>
        </div>
    );
};

export default MiniStatusCard;
