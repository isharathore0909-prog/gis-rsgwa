import React, { useState } from 'react';
import './ControlsSidebar.css';
import { groundwaterData } from '../data/groundwaterData';

const ControlsSidebar = ({ 
    layers, 
    onLayerChange, 
    onFiltersApply,
    onBasemapChange
}) => {

    // Collapsible sections state
    const [expandedSections, setExpandedSections] = useState({
        unitwise: true,
        download: false,
        basemap: false,
        manual: false
    });

    // Unitwise filters (Type added here)
    const [filters, setFilters] = useState({
        source: '',
        district: '',
        timestep: '',
        dataRangeStart: '',
        dataRangeEnd: '',
        stationType: '',
        type: ''   // 👈 NEW TYPE FIELD
    });

    // Options
    const sources = ['Rajasthan GW'];

    const districts = [
        'Ajmer','Alwar','Banswara','Baran','Barmer','Bharatpur','Bhilwara',
        'Bikaner','Bundi','Chittorgarh','Churu','Dausa','Dholpur','Dungarpur',
        'Ganganagar (Sri Ganganagar)','Hanumangarh','Jaipur','Jaisalmer',
        'Jalore','Jhalawar','Jhunjhunu','Jodhpur','Karauli','Kota','Nagaur',
        'Pali','Pratapgarh','Rajsamand','Sawai Madhopur','Sikar','Sirohi',
        'Tonk','Udaipur'
    ];

    const timesteps = ['All', 'Daily', 'Monthly', 'Quarterly', 'Yearly'];

    const stationTypes = ['All', 'Manual', 'Telemetry'];

    // TYPE OPTIONS
    const typeOptions = [
        'Telemetry Station',
        'Ground Water Level',
        'Rainfall Level',
        'Aquifer Station',
        'Reservoirs'
    ];

    // Accordion toggle
    const toggleSection = (section) => {
        setExpandedSections({
            unitwise: section === 'unitwise',
            download: section === 'download',
            basemap: section === 'basemap',
            manual: section === 'manual'
        });
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleProceed = () => {
        if (onFiltersApply) {
            onFiltersApply(filters); // Type included
        }
        alert('Filters applied! Map updated.');
    };

    const handleBasemapSelect = (basemap) => {
        if (onBasemapChange) {
            onBasemapChange(basemap);
        }
    };

    const handleExportData = () => {
        const csvContent = [
            ['Well ID', 'Location', 'Latitude', 'Longitude', 'Water Level (m)', 'pH', 'TDS (mg/L)', 'Nitrate (mg/L)', 'Fluoride (mg/L)'],
            ...groundwaterData.map(well => [
                well.id,
                well.location,
                well.lat,
                well.lng,
                well.waterLevel,
                well.ph,
                well.tds,
                well.nitrate,
                well.fluoride
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'groundwater_data.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <aside className="controls-sidebar">
            <div className="sidebar-content">

                {/* UNITWISE SELECTION */}
                <div className="collapsible-section">
                    <div className="section-header" onClick={() => toggleSection('unitwise')}>
                        <h3>Unitwise Selection</h3>
                        <span>{expandedSections.unitwise ? '▼' : '▶'}</span>
                    </div>

                    {expandedSections.unitwise && (
                        <div className="section-content">

                            <div className="form-group">
                                <label>Source</label>
                                <select
                                    className="select-input"
                                    value={filters.source}
                                    onChange={e => handleFilterChange('source', e.target.value)}
                                >
                                    {sources.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>District</label>
                                <select
                                    className="select-input"
                                    value={filters.district}
                                    onChange={e => handleFilterChange('district', e.target.value)}
                                >
                                    {districts.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Timestep</label>
                                <select
                                    className="select-input"
                                    value={filters.timestep}
                                    onChange={e => handleFilterChange('timestep', e.target.value)}
                                >
                                    {timesteps.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 🔹 NEW TYPE DROPDOWN */}
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    className="select-input"
                                    value={filters.type}
                                    onChange={e => handleFilterChange('type', e.target.value)}
                                >
                                    <option value="">-- Select Type --</option>
                                    {typeOptions.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Data Range</label>
                                <div className="date-range">
                                    <input
                                        type="date"
                                        className="date-input"
                                        onChange={e => handleFilterChange('dataRangeStart', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input
                                        type="date"
                                        className="date-input"
                                        onChange={e => handleFilterChange('dataRangeEnd', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Station Type</label>
                                <select
                                    className="select-input"
                                    value={filters.stationType}
                                    onChange={e => handleFilterChange('stationType', e.target.value)}
                                >
                                    {stationTypes.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <button className="proceed-btn" onClick={handleProceed}>
                                Proceed
                            </button>

                        </div>
                    )}
                </div>

                {/* DOWNLOAD */}
                <div className="collapsible-section">
                    <div className="section-header" onClick={() => toggleSection('download')}>
                        <h3>Data / Report Download</h3>
                        <span>{expandedSections.download ? '▼' : '▶'}</span>
                    </div>

                    {expandedSections.download && (
                        <div className="section-content">
                            <button className="download-btn" onClick={handleExportData}>
                                📥 Download CSV
                            </button>
                            <button className="download-btn" onClick={() => window.print()}>
                                🖨️ Print Map
                            </button>
                        </div>
                    )}
                </div>

                {/* BASEMAP */}
                <div className="collapsible-section">
                    <div className="section-header" onClick={() => toggleSection('basemap')}>
                        <h3>Basemap Gallery</h3>
                        <span>{expandedSections.basemap ? '▼' : '▶'}</span>
                    </div>

                    {expandedSections.basemap && (
                        <div className="section-content">
                            <button onClick={() => handleBasemapSelect('osm')}>OSM</button>
                            <button onClick={() => handleBasemapSelect('satellite')}>Satellite</button>
                            <button onClick={() => handleBasemapSelect('terrain')}>Terrain</button>
                        </div>
                    )}
                </div>

                {/* MANUAL */}
                <div className="collapsible-section">
                    <div className="section-header" onClick={() => toggleSection('manual')}>
                        <h3>User Manual</h3>
                        <span>{expandedSections.manual ? '▼' : '▶'}</span>
                    </div>

                    {expandedSections.manual && (
                        <div className="section-content">
                            <p>Use filters → Proceed → View data on map</p>
                        </div>
                    )}
                </div>

            </div>
        </aside>
    );
};

export default ControlsSidebar;
