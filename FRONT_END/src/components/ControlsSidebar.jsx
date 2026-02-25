import React, { useState, useCallback } from 'react';
import './ControlsSidebar.css';
import { groundwaterData } from '../data/groundwaterData';
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
} from './Common/Icons';

// Hooks & Context
import { useLocations } from '../hooks';
import { useAppContext } from '../context/AppContext';

// Sub-components
import AnalysisFilters from './Controls/AnalysisFilters';
import ExportReporting from './Controls/ExportReporting';
import BasemapSelector from './Controls/BasemapSelector';
import Documentation from './Controls/Documentation';

/**
 * ControlsSidebar Component
 * 
 * Provides map controls, layer selection, filters, and export options.
 * Professional implementation using AppContext and useLocations hook.
 */
const ControlsSidebar = ({
    onLayerChange,
    onFiltersApply,
    onBasemapChange,
    currentBasemap,
    blockBoundaryData,
    handleExportData: handleExportDataFromProps,
    onCoordinateSearch,
    onMapExport
}) => {
    const {
        filters, updateFilters,
        isControlsSidebarCollapsed: isCollapsed,
        setIsControlsSidebarCollapsed: setIsCollapsed
    } = useAppContext();

    // Active tab state - Default to Layer Specification
    const [activeTab, setActiveTab] = useState('layers_spec');

    // Use unified location hook
    const {
        availableDistricts,
        availableBlocks,
        availableGPs,
        availableVillages,
        loading: locationsLoading
    } = useLocations(filters);

    const handleFilterChange = (field, value) => {
        const newFilters = { [field]: value };

        // Reset children when parent changes
        if (field === 'district') {
            newFilters.block = '';
            newFilters.gramPanchayat = '';
            newFilters.village = '';
        }
        if (field === 'block') {
            newFilters.gramPanchayat = '';
            newFilters.village = '';
        }
        if (field === 'gramPanchayat') {
            newFilters.village = '';
        }

        if (field === 'type') {
            newFilters.district = '';
            newFilters.block = '';
            newFilters.gramPanchayat = '';
            newFilters.village = '';

            // Reset specific sub-layers
            if (value !== 'Rainfall') {
                newFilters.showRaingaugeStations = false;
                newFilters.showPiezometers = false;
            }
            if (value !== 'Water Resources') {
                newFilters.showDams = false;
                newFilters.showCanals = false;
                newFilters.showWaterbodies = false;
                newFilters.showMicro = false;
            }
        }

        updateFilters(newFilters);

        // Notify parent if needed (appLogic updates)
        if (onFiltersApply) {
            onFiltersApply({ ...filters, ...newFilters });
        }
    };

    const handleBasemapSelect = (basemap) => {
        if (onBasemapChange) onBasemapChange(basemap);
    };

    const handleExportDataLocal = () => {
        if (handleExportDataFromProps) {
            handleExportDataFromProps();
        } else {
            // Fallback for isolated testing/legacy
            const csvContent = [
                ['Well ID', 'Location', 'Lat', 'Lon', 'Water Level'],
                ...groundwaterData.map(w => [w.id, w.location, w.lat, w.lng, w.waterLevel])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'groundwater_data.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (isCollapsed) setIsCollapsed(false);
    };

    const getTabTitle = (tab) => {
        const titles = {
            'location': 'Area Selection',
            'layers_spec': 'Layer Specification',
            'network': 'Monitoring Network',
            'time': 'Temporal Settings',
            'basemap': 'Basemap Layers',
            'download': 'Export & Reporting',
            'manual': 'Documentation'
        };
        return titles[tab] || 'Controls';
    };

    return (
        <aside className={`controls-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Sidebar Navigation Strip */}
            <nav className="sidebar-nav">
                <div className="nav-item toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)} title="Toggle Sidebar">
                    <IconMenu className="nav-icon" />
                </div>
                <div className="nav-divider"></div>
                <div className={`nav-item ${activeTab === 'layers_spec' ? 'active' : ''}`} onClick={() => handleTabChange('layers_spec')} title="Layer Specification">
                    <IconSettings className="nav-icon" />
                </div>
                <div className={`nav-item ${activeTab === 'location' ? 'active' : ''}`} onClick={() => handleTabChange('location')} title="Area Selection">
                    <IconLocation className="nav-icon" />
                </div>
                <div className={`nav-item ${activeTab === 'network' ? 'active' : ''}`} onClick={() => handleTabChange('network')} title="Monitoring Network">
                    <IconNetwork className="nav-icon" />
                </div>
                <div className={`nav-item ${activeTab === 'time' ? 'active' : ''}`} onClick={() => handleTabChange('time')} title="Temporal Resolution">
                    <IconCalendar className="nav-icon" />
                </div>
                <div className="nav-divider"></div>
                <div className={`nav-item ${activeTab === 'basemap' ? 'active' : ''}`} onClick={() => handleTabChange('basemap')} title="Basemap Layers">
                    <IconLayers className="nav-icon" />
                </div>
                <div className={`nav-item ${activeTab === 'download' ? 'active' : ''}`} onClick={() => handleTabChange('download')} title="Export Data">
                    <IconDownload className="nav-icon" />
                </div>
                <div style={{ marginTop: 'auto' }}></div>
                <div className={`nav-item ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => handleTabChange('manual')} title="Help">
                    <IconHelp className="nav-icon" />
                </div>
            </nav>

            {/* Content Panel */}
            <div className="sidebar-panel">
                <div className="panel-header">
                    <h2>{getTabTitle(activeTab)}</h2>
                    {locationsLoading && <div className="small-loader"></div>}
                </div>

                <div className="panel-content">
                    {activeTab === 'location' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            availableGPs={availableGPs}
                            availableVillages={availableVillages}
                            districts={availableDistricts}
                            section="location"
                            onCoordinateSearch={onCoordinateSearch}
                        />
                    )}

                    {activeTab === 'layers_spec' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            availableGPs={availableGPs}
                            availableVillages={availableVillages}
                            districts={availableDistricts}
                            section="layers"
                        />
                    )}

                    {activeTab === 'network' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            availableGPs={availableGPs}
                            availableVillages={availableVillages}
                            districts={availableDistricts}
                            section="network"
                        />
                    )}

                    {activeTab === 'time' && (
                        <AnalysisFilters
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            availableBlocks={availableBlocks}
                            availableGPs={availableGPs}
                            availableVillages={availableVillages}
                            districts={availableDistricts}
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
                        <ExportReporting
                            handleExportData={handleExportDataLocal}
                            handleMapExport={onMapExport}
                            filters={filters}
                        />
                    )}

                    {activeTab === 'manual' && <Documentation />}
                </div>
            </div>
        </aside>
    );
};

export default ControlsSidebar;
