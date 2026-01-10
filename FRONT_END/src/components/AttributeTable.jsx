import React, { useState, useEffect } from 'react';
import { IconChevronDown, IconMap, IconTrash } from './Icons';
import './AttributeTable.css';

const AttributeTable = ({ data, onRowClick, selectedIds = [], onToggleSelection, onRemoveRow }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Resizable State
    const [height, setHeight] = useState(320); // Default open height
    const [isDragging, setIsDragging] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Drag Handlers for Vertical Resizing
    const handleMouseDown = (e) => {
        // Only allow dragging from header if not clicking specific actions
        if (e.target.closest('.header-actions') || e.target.closest('.row-action-btn') || e.target.tagName === 'INPUT') return;

        setIsDragging(true);
        e.preventDefault(); // Prevent text selection
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            // Calculate new height: Distance from bottom of screen to mouse pointer
            // Height = Window Height - Mouse Y Coordinate
            const newHeight = window.innerHeight - e.clientY;

            // Constraints
            const minHeight = 48; // Header height
            const maxHeight = window.innerHeight - 100; // Leave some space at top

            // If dragged very low, consider it collapsing? For now just clamp.
            setHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));

            // Auto-expand if dragging up when collapsed
            if (isCollapsed && newHeight > 50) {
                setIsCollapsed(false);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isCollapsed]);

    if (!data || !data.features || data.features.length === 0) {
        const msg = !data ? "Loading attribute data..." : "No features found.";
        return (
            <div
                className={`attribute-table-container ${isCollapsed ? 'collapsed' : ''}`}
                style={{ height: isCollapsed ? '48px' : `${height}px` }}
            >
                <div
                    className="attribute-table-header"
                    onMouseDown={handleMouseDown}
                    onClick={(e) => {
                        // Click to toggle if not dragging
                        if (!isDragging) toggleCollapse();
                    }}
                    role="button"
                    style={{ cursor: 'ns-resize' }}
                >
                    <div className="header-title-container">
                        <IconMap className="header-icon" />
                        <h4>Attribute Inventory Analysis</h4>
                    </div>
                    <div className="header-actions">
                        <IconChevronDown
                            className={`toggle-icon ${isCollapsed ? '' : 'rotated'}`}
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
                        />
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
        <div
            className={`attribute-table-container ${isCollapsed ? 'collapsed' : ''}`}
            style={{ height: isCollapsed ? '48px' : `${height}px` }}
        >
            <div
                className="attribute-table-header"
                onMouseDown={handleMouseDown}
                style={{ cursor: 'ns-resize' }}
            >
                <div className="header-title-container" onClick={toggleCollapse}>
                    <IconMap className="header-icon" />
                    <h4>Attribute Inventory Analysis</h4>
                    <span className="record-count">{data.features.length} Entities</span>
                    {selectedIds.length > 0 && (
                        <span className="selection-badge">{selectedIds.length} Selected</span>
                    )}
                </div>
                <div className="header-actions">
                    <span className="toggle-label" onClick={toggleCollapse}>{isCollapsed ? 'Expand' : 'Collapse'}</span>
                    <div onClick={toggleCollapse} style={{ display: 'flex' }}>
                        <IconChevronDown className={`toggle-icon ${isCollapsed ? '' : 'rotated'}`} />
                    </div>
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
