import React from 'react';

const AnalysisCard = ({ title, children, className = '', style = {} }) => {
    return (
        <div className={`analysis-card ${className}`} style={style}>
            {title && (
                <div className="section-header-flat">
                    <h3>{title}</h3>
                </div>
            )}
            {children}
        </div>
    );
};

export default AnalysisCard;
