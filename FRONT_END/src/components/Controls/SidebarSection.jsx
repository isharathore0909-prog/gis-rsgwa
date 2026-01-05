import React from 'react';
import { IconChevronDown } from '../Icons';

const SidebarSection = ({
    id,
    title,
    icon: Icon,
    isActive,
    onToggle,
    children,
    className = ""
}) => {
    return (
        <div className={`collapsible-section ${isActive ? 'active' : ''} ${className}`}>
            <div className="section-header" onClick={() => onToggle(id)}>
                <div className="header-left">
                    <Icon className="header-icon" />
                    <h3>{title}</h3>
                </div>
                <IconChevronDown className="toggle-icon" />
            </div>
            {isActive && (
                <div className="section-content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default SidebarSection;
