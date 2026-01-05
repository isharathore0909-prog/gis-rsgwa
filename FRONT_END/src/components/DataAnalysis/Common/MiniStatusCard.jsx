import React from 'react';

const MiniStatusCard = ({ value, label, color, style }) => {
    return (
        <div className="status-mini-card" style={{ borderLeftColor: color, ...style }}>
            <div className="mini-val">{value}</div>
            <div className="mini-label">{label}</div>
        </div>
    );
};

export default MiniStatusCard;
