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
} from './Common/Icons';
import api from '../api';

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
    setIsCollapsed,
    handleExportData: handleExportDataFromProps,
    onCoordinateSearch,
    onMapExport
}) => {

    // Active tab state - Default to Location
    const [activeTab, setActiveTab] = useState('layers_spec');

    // Unitwise filters
    const [filters, setFilters] = useState({
        source: 'Rajasthan GW',
        district: '',
        block: '',
        gramPanchayat: '',
        village: '',
        timestep: 'Monthly',
        dataRangeStart: '',
        dataRangeEnd: '',
        stationType: 'All',
        type: '',
        showRaingaugeStations: false,
        showDams: false,
        showCanals: false,
        showWaterbodies: false,
        showMicro: false
    });

    const [apiDistricts, setApiDistricts] = useState([]);
    const [apiBlocks, setApiBlocks] = useState([]);
    const [apiGPs, setApiGPs] = useState([]);
    const [apiVillages, setApiVillages] = useState([]);
    const [rainfallData, setRainfallData] = useState([]);

    // Fetch districts on mount (for Rajasthan)
    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                // First get Rajasthan state ID
                const stateRes = await api.location.getStates({ name: 'Rajasthan' });
                const states = stateRes.results || stateRes;
                if (states && states.length > 0) {
                    const rajasthanId = states[0].id;
                    const districtRes = await api.location.getDistricts({ state: rajasthanId });
                    setApiDistricts(districtRes.results || districtRes);
                }
            } catch (error) {
                console.error("Error fetching districts:", error);
            }
        };
        fetchDistricts();
    }, []);

    // Helper for Title Case
    const toTitleCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    };

    // Fetch blocks when district changes (Using API with direct DB query)
    useEffect(() => {
        const fetchBlocks = async () => {
            if (!filters.district) {
                setApiBlocks([]);
                return;
            }

            try {
                // Use new name-based filtering supported by backend
                const blockRes = await api.location.getBlocks({ district_name: filters.district });
                setApiBlocks(blockRes.results || blockRes);
            } catch (error) {
                console.error("Error fetching blocks:", error);
                setApiBlocks([]);
            }
        };
        fetchBlocks();
    }, [filters.district]);

    // Fetch GPs when block changes (Using API with direct DB query)
    useEffect(() => {
        const fetchGPs = async () => {
            if (!filters.block) {
                setApiGPs([]);
                return;
            }

            try {
                const gpRes = await api.location.getGrampanchayats({ block_name: filters.block });
                setApiGPs(gpRes.results || gpRes);
            } catch (error) {
                console.error("Error fetching GPs:", error);
                setApiGPs([]);
            }
        };
        fetchGPs();
    }, [filters.block]);

    // Fetch Villages when GP changes (Using API with direct DB query)
    useEffect(() => {
        const fetchVillages = async () => {
            if (!filters.block) {
                setApiVillages([]);
                return;
            }

            try {
                const params = {};
                if (filters.gramPanchayat) {
                    params.gp_name = filters.gramPanchayat;
                } else if (filters.block) {
                    params.block_name = filters.block;
                }

                if (params.gp_name || params.block_name) {
                    const villageRes = await api.location.getVillages(params);
                    setApiVillages(villageRes.results || villageRes);
                }
            } catch (error) {
                console.error("Error fetching villages:", error);
            }
        };
        fetchVillages();
    }, [filters.gramPanchayat, filters.block]);

    // List of districts to show in dropdown
    const availableDistricts = useMemo(() => {
        let items = [];
        if (apiDistricts && apiDistricts.length > 0) {
            items = apiDistricts.map(d => toTitleCase(d.name));
        } else {
            items = DISTRICTS.map(d => toTitleCase(d));
        }
        return [...new Set(items)].sort((a, b) => a.localeCompare(b));
    }, [apiDistricts]);

    // List of blocks to show in dropdown
    const availableBlocks = useMemo(() => {
        if (apiBlocks && apiBlocks.length > 0) {
            return [...new Set(apiBlocks.map(b => toTitleCase(b.name)))].sort((a, b) => a.localeCompare(b));
        }
        return [];
    }, [apiBlocks]);

    // List of GPs to show in dropdown
    const availableGPs = useMemo(() => {
        if (apiGPs && apiGPs.length > 0) {
            return [...new Set(apiGPs.map(g => toTitleCase(g.name)))].sort((a, b) => a.localeCompare(b));
        }
        return [];
    }, [apiGPs]);

    // List of Villages to show in dropdown
    const availableVillages = useMemo(() => {
        if (apiVillages && apiVillages.length > 0) {
            return [...new Set(apiVillages.map(v => toTitleCase(v.name)))].sort((a, b) => a.localeCompare(b));
        }
        return [];
    }, [apiVillages]);

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };

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

            // Reset raingauge stations checkbox if moving away from Rainfall
            if (value !== 'Rainfall') {
                newFilters.showRaingaugeStations = false;
            }

            // Reset Water Resources sub-layers if moving away from Water Resources
            if (value !== 'Water Resources') {
                newFilters.showDams = false;
                newFilters.showCanals = false;
                newFilters.showWaterbodies = false;
                newFilters.showMicro = false;
            }
        }

        setFilters(newFilters);

        // Immediate update for map and analysis sidebar
        if (onFiltersApply) {
            onFiltersApply(newFilters);
        }
    };

    const handleBasemapSelect = (basemap) => {
        if (onBasemapChange) {
            onBasemapChange(basemap);
        }
    };

    const handleExportDataLocal = () => {
        if (handleExportDataFromProps) {
            handleExportDataFromProps();
        } else {
            // Fallback to dummy data if no prop provided (legacy)
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
        }
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
                    className={`nav-item ${activeTab === 'layers_spec' ? 'active' : ''}`}
                    onClick={() => handleTabChange('layers_spec')}
                    title="Layer Specification"
                >
                    <IconSettings className="nav-icon" />
                </div>

                <div
                    className={`nav-item ${activeTab === 'location' ? 'active' : ''}`}
                    onClick={() => handleTabChange('location')}
                    title="Area Selection"
                >
                    <IconLocation className="nav-icon" />
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

                    {activeTab === 'manual' && (
                        <Documentation />
                    )}
                </div>
            </div>
        </aside>
    );
};

export default ControlsSidebar;
