import React, { useState } from 'react';
import { IconChevronDown, IconMap } from './Icons';
import './AttributeTable.css';

const AttributeTable = ({ data, onRowClick }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    if (!data || !data.features || data.features.length === 0) {
        const msg = !data ? "Loading attribute data..." : "No features found in block boundary data.";
        return (
            <div className={`attribute-table-container ${isCollapsed ? 'collapsed' : ''}`}>
                <div
                    className="attribute-table-header"
                    onClick={toggleCollapse}
                    role="button"
                    aria-expanded={!isCollapsed}
                >
                    <div className="header-title-container">
                        <IconMap className="header-icon" />
                        <h4>Attribute Inventory Analysis</h4>
                    </div>
                    <div className="header-actions">
                        <IconChevronDown className={`toggle-icon ${isCollapsed ? '' : 'rotated'}`} />
                    </div>
                </div>
                <div className={`collapsible-content ${isCollapsed ? 'hidden' : ''}`}>
                    <div className="table-msg">{msg}</div>
                </div>
            </div>
        );
    }

    // Extract headers from the first feature's properties
    const headers = Object.keys(data.features[0].properties);

    return (
        <div className={`attribute-table-container ${isCollapsed ? 'collapsed' : ''}`}>
            <div
                className="attribute-table-header"
                onClick={toggleCollapse}
                role="button"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "Expand attribute table" : "Collapse attribute table"}
            >
                <div className="header-title-container">
                    <IconMap className="header-icon" />
                    <h4>Attribute Inventory Analysis</h4>
                    <span className="record-count">{data.features.length} Entities</span>
                </div>
                <div className="header-actions">
                    <span className="toggle-label">{isCollapsed ? 'Expand' : 'Collapse'}</span>
                    <IconChevronDown className={`toggle-icon ${isCollapsed ? '' : 'rotated'}`} />
                </div>
            </div>

            <div className={`collapsible-content ${isCollapsed ? 'hidden' : ''}`}>
                <div className="table-wrapper">
                    <table className="attribute-table">
                        <thead>
                            <tr>
                                {headers.map(header => (
                                    <th key={header}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.features.map((feature, index) => (
                                <tr
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRowClick && onRowClick(feature);
                                    }}
                                    className="table-row"
                                >
                                    {headers.map(header => (
                                        <td key={`${index}-${header}`}>
                                            {feature.properties[header]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttributeTable;
