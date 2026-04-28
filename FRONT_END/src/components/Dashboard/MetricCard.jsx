import React from 'react';
import * as Icons from 'lucide-react';
import './MetricCard.css';

const MetricCard = ({ id, title, icon, color, unit, value, trend, trendLabel, onClick, onMouseEnter, onMouseLeave, children }) => {
    const IconComponent = Icons[icon] || Icons.Circle;

    return (
        <div
            className="metric-card"
            style={{ '--theme-color': color }}
            onClick={() => onClick && onClick(id)}
            onMouseEnter={() => onMouseEnter && onMouseEnter(id)}
            onMouseLeave={() => onMouseLeave && onMouseLeave()}
        >
            <div className="card-header">
                <div className="title-section">
                    <div className="icon-wrapper">
                        <IconComponent size={20} color={color} />
                    </div>
                    <h3>{title}</h3>
                </div>
                <div className="expand-hint">
                    <Icons.Expand size={16} />
                </div>
            </div>

            <div className="card-body">
                {value !== null && value !== undefined && (
                    <div className="metric-value-row">
                        <div className="main-value">
                            <span className="number">{value || '---'}</span>
                            <span className="unit">{unit}</span>
                        </div>
                        {trend && (
                            <div className={`trend-indicator ${trend > 0 ? 'up' : 'down'}`}>
                                {trend > 0 ? <Icons.ArrowUpRight size={14} /> : <Icons.ArrowDownRight size={14} />}
                                <span>{Math.abs(trend)}%</span>
                            </div>
                        )}
                    </div>
                )}
                {trendLabel && <p className="trend-label">{trendLabel}</p>}

                <div className="chart-preview">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MetricCard;
