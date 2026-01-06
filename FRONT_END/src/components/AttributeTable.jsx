import React, { useState } from 'react';
import { IconChevronDown, IconMap, IconTrash } from './Icons';
import './AttributeTable.css';

const AttributeTable = ({ data, onRowClick, selectedIds = [], onToggleSelection, onRemoveRow }) => {
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
    const allIds = data.features.map(f => f.id);
    const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));

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
                    {selectedIds.length > 0 && (
                        <span className="selection-badge">{selectedIds.length} Selected</span>
                    )}
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
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={() => onToggleSelection && onToggleSelection('all')}
                                    />
                                </th>
                                {headers.map(header => (
                                    <th key={header}>{header}</th>
                                ))}
                                <th style={{ width: '60px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.features.map((feature, index) => {
                                const isSelected = selectedIds.includes(feature.id);
                                return (
                                    <tr
                                        key={feature.id || index}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRowClick && onRowClick(feature);
                                        }}
                                        className={`table-row ${isSelected ? 'selected' : ''}`}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onToggleSelection && onToggleSelection(feature.id);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        {headers.map(header => (
                                            <td key={`${index}-${header}`}>
                                                {feature.properties[header]}
                                            </td>
                                        ))}
                                        <td>
                                            <button
                                                className="row-action-btn delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveRow && onRemoveRow(feature.id);
                                                }}
                                                title="Remove from table"
                                            >
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttributeTable;
