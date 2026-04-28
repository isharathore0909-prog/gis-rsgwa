import React, { useState } from 'react';
import {
    Globe, CloudRain, Droplets, Waves,
    Thermometer, Settings, MoreHorizontal,
    LayoutGrid, Database, FlaskConical
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import './VerticalIconSidebar.css';


const DOMAINS = [
    { id: 'rainfall', icon: CloudRain, label: 'Rainfall', layerType: 'Rainfall' },
    { id: 'groundwater', icon: Droplets, label: 'Ground Water', layerType: 'Ground Water Resource Estimation' },
    { id: 'water_resource', icon: Waves, label: 'Water Resource', layerType: 'Water Resources' },
    { id: 'water_level', icon: Thermometer, label: 'Water Level', layerType: 'Well Inventory' },
    { id: 'water_quality', icon: FlaskConical, label: 'Water Quality', layerType: 'Water Quality' },
    { id: 'aquifer', icon: Database, label: 'Aquifer', layerType: 'Aquifer' },
    { id: 'more', icon: MoreHorizontal, label: 'More', layerType: null }
];

const VerticalIconSidebar = () => {
    const { filters, setFilters, setViewMode } = useAppContext();
    const [hoveredDomain, setHoveredDomain] = useState(null);

    const handleDomainClick = (domain, subLayer = null) => {
        if (domain.layerType !== null) {
            setFilters(prev => {
                // Always reset administrative scope when switching layers
                const newFilters = {
                    ...prev,
                    type: domain.layerType,
                    // Clear administrative drill-down to start fresh at state level
                    district: '',
                    districtId: null,
                    districtCode: null,
                    block: '',
                    blockId: null,
                    blockCode: null,
                    gramPanchayat: '',
                    gpId: null,
                    gpCode: null,
                    village: '',
                    vlgId: null
                };

                // Handle Water Resources sub-layers
                if (domain.layerType === 'Water Resources') {
                    const isInitial = !subLayer && prev.type !== 'Water Resources';
                    newFilters.showDams = subLayer === 'dams' || isInitial;
                    newFilters.showCanals = subLayer === 'canals';
                    newFilters.showWaterbodies = subLayer === 'waterbodies';
                    newFilters.showMicro = subLayer === 'micro';
                    newFilters.showRecharge = subLayer === 'recharge';
                }

                // Handle Water Quality sub-layers
                if (domain.layerType === 'Water Quality') {
                    const isInitial = !subLayer && prev.type !== 'Water Quality';
                    newFilters.showEC = subLayer === 'ec' || isInitial;
                    newFilters.showTDS = subLayer === 'tds';
                    newFilters.showFluoride = subLayer === 'fluoride';
                    newFilters.showPH = subLayer === 'ph';
                    newFilters.showNitrate = false;
                    newFilters.legendFeature = subLayer ? {
                        'ec': 'EC', 'tds': 'TDS', 'fluoride': 'Fluoride', 'ph': 'PH'
                    }[subLayer] : 'status';
                    newFilters.showMarkers = true;
                }

                if (domain.layerType === 'Rainfall') {
                    newFilters.legendFeature = 'avg_rainfall';
                }

                if (domain.layerType === 'Ground Water Resource Estimation') {
                    newFilters.legendFeature = 'Category';
                }

                if (domain.layerType === 'Well Inventory') {
                    newFilters.legendFeature = 'Static WL';
                }

                return newFilters;
            });
        }
    };

    const WATER_RESOURCE_OPTIONS = [
        { id: 'dams', label: 'Dams', key: 'showDams' },
        { id: 'waterbodies', label: 'Water Bodies', key: 'showWaterbodies' },
        { id: 'canals', label: 'Canals', key: 'showCanals' },
        { id: 'micro', label: 'Micro Watershed', key: 'showMicro' }
    ];

    const WATER_QUALITY_OPTIONS = [
        { id: 'ec', label: 'EC', key: 'showEC' },
        { id: 'tds', label: 'TDS', key: 'showTDS' },
        { id: 'fluoride', label: 'Fluoride', key: 'showFluoride' },
        { id: 'ph', label: 'pH', key: 'showPH' }
    ];

    return (
        <aside className="vertical-icon-sidebar">
            <nav className="domain-nav">
                {DOMAINS.map((domain) => {
                    const isActive = filters.type === domain.layerType;
                    const Icon = domain.icon;
                    const isWR = domain.id === 'water_resource';
                    const isWQ = domain.id === 'water_quality';

                    return (
                        <div
                            key={domain.id}
                            className={`domain-item-container ${hoveredDomain === domain.id ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredDomain(domain.id)}
                            onMouseLeave={() => setHoveredDomain(null)}
                        >
                            <div
                                className={`domain-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleDomainClick(domain)}
                                title={domain.label}
                            >
                                <div className="icon-wrapper">
                                    <Icon size={24} />
                                </div>
                                <span className="domain-label">{domain.label}</span>
                            </div>

                            {/* Flyout Menu for Water Resource */}
                            {isWR && (
                                <div className="domain-flyout">
                                    <div className="flyout-header">Select Sub-Layer</div>
                                    <div className="flyout-options">
                                        {WATER_RESOURCE_OPTIONS.map(opt => (
                                            <div
                                                key={opt.id}
                                                className={`flyout-option ${filters[opt.key] ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDomainClick(domain, opt.id);
                                                    setHoveredDomain(null);
                                                }}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flyout Menu for Water Quality */}
                            {isWQ && (
                                <div className="domain-flyout">
                                    <div className="flyout-header">Select Parameter</div>
                                    <div className="flyout-options">
                                        {WATER_QUALITY_OPTIONS.map(opt => (
                                            <div
                                                key={opt.id}
                                                className={`flyout-option ${filters[opt.key] ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDomainClick(domain, opt.id);
                                                    setHoveredDomain(null);
                                                }}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>



            <div className="sidebar-footer">
                <div className="footer-item" title="Dashboard View" onClick={() => setViewMode('dashboard')}>
                    <LayoutGrid size={22} />
                </div>
                <div className="footer-item" title="MIS Data">
                    <Database size={22} />
                    <span className="footer-label">MIS</span>
                </div>
            </div>
        </aside>
    );
};

export default VerticalIconSidebar;
