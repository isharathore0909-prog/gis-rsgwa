import React, { useState, useMemo, useEffect } from 'react';
import './ControlsSidebar.css';
import { groundwaterData } from '../data/groundwaterData';
import { DISTRICTS } from '../constants/uiOptions';
import {
    IconMap,
    IconDownload,
    IconHelp,
    IconMenu,
    IconSearch,
    IconLayers,
    IconLocation,
    IconCalendar,
    IconSettings,
    IconNetwork
} from './Icons';
import api from '../services/api';

// Sub-components
import AnalysisFilters from './Controls/AnalysisFilters';
import ExportReporting from './Controls/ExportReporting';
import BasemapSelector from './Controls/BasemapSelector';
import Documentation from './Controls/Documentation';

/**
 * ControlsSidebar Component
 * 
 * Provides map controls, layer selection, filters, and export options.
 * Refactored to split Unitwise Selection into distinct Location, Layers, and Time sections.
 */
const ControlsSidebar = ({
    onFiltersApply,
    onBasemapChange,
    currentBasemap,
    blockBoundaryData,
    isCollapsed,
    setIsCollapsed
}) => {

    // Active tab state - Default to Location
    const [activeTab, setActiveTab] = useState('location');

    // Unitwise filters
    const [filters, setFilters] = useState({
        source: 'Rajasthan GW',
        district: '',
        block: '',
        timestep: 'Monthly',
        dataRangeStart: '',
        dataRangeEnd: '',
        stationType: 'All',
        type: ''
    });

    const [apiDistricts, setApiDistricts] = useState([]);
    const [apiBlocks, setApiBlocks] = useState([]);

    // Fetch districts on mount (for Rajasthan)
    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                // First get Rajasthan state ID
                const states = await api.location.getStates({ name: 'Rajasthan' });
                if (states && states.length > 0) {
                    const rajasthanId = states[0].id;
                    const districtData = await api.location.getDistricts({ state: rajasthanId });
                    setApiDistricts(districtData);
                }
            } catch (error) {
                console.error("Error fetching districts:", error);
                // Fallback to empty or previous constant if needed? 
                // For now just error log
            }
        };
        fetchDistricts();
    }, []);

    // Fetch blocks when district changes
    useEffect(() => {
        const fetchBlocks = async () => {
            if (!filters.district) {
                setBlocks([]);
                return;
            }

            try {
                // Find district ID by name
                const district = apiDistricts.find(d => d.name === filters.district);
                if (district) {
                    const blockData = await api.location.getBlocks({ district: district.id });
                    setApiBlocks(blockData);
                }
            } catch (error) {
                console.error("Error fetching blocks:", error);
            }
        };
        fetchBlocks();
    }, [filters.district, apiDistricts]);

    // List of districts to show in dropdown
    const memoDistricts = useMemo(() => {
        if (filters.type === 'Rainfall') return apiDistricts;
        return DISTRICTS;
    }, [filters.type, apiDistricts]);

    // List of blocks to show in dropdown
    const availableBlocks = useMemo(() => {
        // Source from database for Rainfall
        if (filters.type === 'Rainfall') {
            return apiBlocks.map(b => b.name);
        }

        // Otherwise fallback to GeoJSON/Static derivation
        if (!blockBoundaryData || !filters.district) return [];
        const geoBlocks = blockBoundaryData.features
            .filter(f => (f.properties.DIST_NAME || f.properties.District)?.toUpperCase() === filters.district.toUpperCase())
            .map(f => f.properties.BLOCK_NAME || f.properties.Block)
            .filter(Boolean)
            .sort();
        return [...new Set(geoBlocks)];
    }, [filters.type, apiBlocks, blockBoundaryData, filters.district]);

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };

        // Reset children when parent changes
        if (field === 'district') {
            newFilters.block = '';
        }

        // Reset district and taluka when switching into or out of specialized types
        const isCurrentlySpecial = filters.type === 'Ground Water Resource Estimation' || filters.type === 'Rainfall';
        const willBeSpecial = value === 'Ground Water Resource Estimation' || value === 'Rainfall';

        if (field === 'type' && (isCurrentlySpecial || willBeSpecial)) {
            newFilters.district = '';
            newFilters.block = '';
        }

        setFilters(newFilters);

        // Immediate map update for all layer types to show warnings or valid layers instantly
        if (field === 'type') {
            if (onFiltersApply) {
                onFiltersApply(newFilters);
            }
        }
    };

    const handleProceed = () => {
        if (onFiltersApply) {
            onFiltersApply(filters);
        }
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

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (isCollapsed) {
            setIsCollapsed(false);
        }
    };

    const getTabTitle = (tab) => {
        switch (tab) {
            case 'location': return 'Area Selection';
            case 'layers_spec': return 'Layer Specification';
            case 'network': return 'Monitoring Network';
            case 'time': return 'Temporal Settings';
            case 'basemap': return 'Basemap Layers';
            case 'download': return 'Export & Reporting';
            case 'manual': return 'Documentation';
            default: return 'Controls';
        }
    };

    return (
        <aside className={`controls-sidebar ${isCollapsed ? 'collapsed' : ''}`}>

            {/* Sidebar Navigation Strip */}
            <nav className="sidebar-nav">
                <div
                    className="nav-item toggle-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title="Toggle Sidebar"
                >
                    <IconMenu className="nav-icon" />
                </div>

                <div className="nav-divider"></div>

                {/* Split Unitwise Selection Icons */}
                <div
                    className={`nav-item ${activeTab === 'location' ? 'active' : ''}`}
                    onClick={() => handleTabChange('location')}
                    title="Area Selection"
                >
                    <IconLocation className="nav-icon" />
                </div>

                <div
                    className={`nav-item ${activeTab === 'layers_spec' ? 'active' : ''}`}
                    onClick={() => handleTabChange('layers_spec')}
                    title="Layer Specification"
                >
                    <IconSettings className="nav-icon" />
                </div>

                <div
                    className={`nav-item ${activeTab === 'network' ? 'active' : ''}`}
                    onClick={() => handleTabChange('network')}
                    title="Monitoring Network"
                >
                    <IconNetwork className="nav-icon" />
                </div>

                <div
                    className={`nav-item ${activeTab === 'time' ? 'active' : ''}`}
                    onClick={() => handleTabChange('time')}
                    title="Temporal Resolution"
                >
                    <IconCalendar className="nav-icon" />

                </div>

                <div className="nav-divider"></div>

                <div
                    className={`nav-item ${activeTab === 'basemap' ? 'active' : ''}`}
                    onClick={() => handleTabChange('basemap')}
                    title="Basemap Layers"
                >
                    <IconLayers className="nav-icon" />
                </div>

                <div
                    className={`nav-item ${activeTab === 'download' ? 'active' : ''}`}
                    onClick={() => handleTabChange('download')}
                    title="Export Data"
                >
                    <IconDownload className="nav-icon" />
                </div>

                <div style={{ marginTop: 'auto' }}></div>

                <div
                    className={`nav-item ${activeTab === 'manual' ? 'active' : ''}`}
                    onClick={() => handleTabChange('manual')}
                    title="Help"
                >
                    <IconHelp className="nav-icon" />
                </div>
            </nav>

            {/* Content Panel */}
            <div className="sidebar-panel">
                <div className="panel-header">
                    <h2>{getTabTitle(activeTab)}</h2>
                </div>

                <div className="panel-content">
                    {activeTab === 'location' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            districts={memoDistricts}
                            handleProceed={handleProceed}
                            section="location"
                        />
                    )}

                    {activeTab === 'layers_spec' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            districts={memoDistricts}
                            handleProceed={handleProceed}
                            section="layers"
                        />
                    )}

                    {activeTab === 'network' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            districts={memoDistricts}
                            handleProceed={handleProceed}
                            section="network"
                        />
                    )}

                    {activeTab === 'time' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            districts={memoDistricts}
                            handleProceed={handleProceed}
                            section="time"
                        />
                    )}

                    {activeTab === 'basemap' && (
                        <BasemapSelector
                            currentBasemap={currentBasemap}
                            handleBasemapSelect={handleBasemapSelect}
                        />
                    )}

                    {activeTab === 'download' && (
                        <ExportReporting handleExportData={handleExportData} />
                    )}

                    {activeTab === 'manual' && (
                        <Documentation />
                    )}
                </div>
            </div>
        </aside>
    );
};

export default ControlsSidebar;
