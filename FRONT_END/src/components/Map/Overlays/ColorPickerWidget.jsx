import React from 'react';

/**
 * Color Picker Widget
 */
export const ColorPickerWidget = ({
    isActive,
    layerColors,
    onColorChange,
    onClose
}) => {
    if (!isActive) return null;

    return (
        <div className="color-picker-widget animated-fade-in">
            <div className="widget-header">
                <h4>Layer Colors</h4>
                <button onClick={onClose} className="close-btn">×</button>
            </div>
            <div className="widget-content">
                {Object.entries(layerColors).map(([key, color]) => (
                    <div key={key} className="color-option">
                        <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onColorChange(key, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
