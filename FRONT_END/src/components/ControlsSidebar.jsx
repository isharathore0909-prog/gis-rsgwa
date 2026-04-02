import React, { useState } from 'react';
import './ControlsSidebar.css';
import {
    IconMap, IconDownload, IconHelp, IconMenu,
    IconSearch, IconLayers, IconLocation, IconCalendar,
    IconSettings, IconNetwork
} from './Common/Icons';

// Hooks & Context
import { useLocations } from '../hooks';
import { useAppContext } from '../context/AppContext';
import { useSidebarFilters } from '../hooks/ui/useSidebarFilters';

// Sub-components
import AnalysisFilters from './Controls/AnalysisFilters';
import ExportReporting from './Controls/ExportReporting';
import BasemapSelector from './Controls/BasemapSelector';
import Documentation from './Controls/Documentation';

/**
 * ControlsSidebar Component
 * Provides map controls, layer selection, filters, and export options.
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

    const [activeTab, setActiveTab] = useState('layers_spec');

    const {
        availableDistricts, availableBlocks, availableGPs, availableVillages,
        apiDistricts, apiBlocks, apiGPs
    } = useLocations(filters);

    const { handleFilterChange } = useSidebarFilters(
        filters, updateFilters, apiDistricts, apiBlocks, apiGPs, onFiltersApply
    );

    const handleBasemapSelect = (basemap) => {
        if (onBasemapChange) onBasemapChange(basemap);
    };

    const handleExportDataLocal = () => {
        if (handleExportDataFromProps) {
            handleExportDataFromProps();
        } else {
            console.warn("No data export available in current view.");
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
                </div>

                <div className="panel-content">
                    {activeTab === 'location' && (
                        <AnalysisFilters filters={filters} handleFilterChange={handleFilterChange} availableBlocks={availableBlocks} availableGPs={availableGPs} availableVillages={availableVillages} districts={availableDistricts} section="location" onCoordinateSearch={onCoordinateSearch} />
                    )}
                    {activeTab === 'layers_spec' && (
                        <AnalysisFilters filters={filters} handleFilterChange={handleFilterChange} availableBlocks={availableBlocks} availableGPs={availableGPs} availableVillages={availableVillages} districts={availableDistricts} section="layers" />
                    )}
                    {activeTab === 'network' && (
                        <AnalysisFilters filters={filters} handleFilterChange={handleFilterChange} availableBlocks={availableBlocks} availableGPs={availableGPs} availableVillages={availableVillages} districts={availableDistricts} section="network" />
                    )}
                    {activeTab === 'time' && (
                        <AnalysisFilters filters={filters} handleFilterChange={handleFilterChange} availableBlocks={availableBlocks} availableGPs={availableGPs} availableVillages={availableVillages} districts={availableDistricts} section="time" />
                    )}
                    {activeTab === 'basemap' && (
                        <BasemapSelector currentBasemap={currentBasemap} handleBasemapSelect={handleBasemapSelect} />
                    )}
                    {activeTab === 'download' && (
                        <ExportReporting handleExportData={handleExportDataLocal} handleMapExport={onMapExport} filters={filters} />
                    )}
                    {activeTab === 'manual' && <Documentation />}
                </div>
            </div>
        </aside>
    );
};

export default ControlsSidebar;
