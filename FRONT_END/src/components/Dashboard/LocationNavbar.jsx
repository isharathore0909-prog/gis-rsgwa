import React from 'react';
import { Map, Home, ArrowLeft, BarChart2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useLocations } from '../../hooks/ui/useLocations';
import { toTitleCase } from '../../utils/namingUtils';
import './LocationNavbar.css';
import BreadcrumbMenu from './BreadcrumbMenu';

const LocationNavbar = ({ metricId, isDetailedView, setIsDetailedView, showDetailedAnalysisBtn }) => {
    const { filters, updateFilters, setViewMode, viewMode, setFilters } = useAppContext();
    const {
        availableDistricts,
        availableBlocks,
        availableGPs,
        availableVillages,
        apiDistricts,
        apiBlocks,
        apiGPs,
        apiVillages,
        loading
    } = useLocations(filters);

    const handleBack = () => {
        if (filters.village) {
            updateFilters({ village: '', vlgId: null });
        } else if (filters.gramPanchayat) {
            updateFilters({ gramPanchayat: '', gpId: null });
        } else if (filters.block) {
            updateFilters({ block: '', blockId: null, blockCode: null });
        } else if (filters.district) {
            updateFilters({ district: '', districtId: null, districtCode: null, block: '', blockId: null, blockCode: null });
        }
    };

    const handleHome = () => {
        setFilters(prev => ({
            ...prev,
            district: '', districtId: null, districtCode: null,
            block: '', blockId: null, blockCode: null,
            gramPanchayat: '', gpId: null, gpCode: null,
            village: '', vlgId: null
        }));
    };

    const handleFilterChange = (key, value) => {
        if (!value) {
            handleBack();
            return;
        }

        const normalizedValue = toTitleCase(value);
        const updates = { [key]: normalizedValue };

        if (key === 'district') {
            const distObj = (apiDistricts || []).find(d => toTitleCase(d.name || d.district_name) === normalizedValue);
            updates.districtId = distObj ? distObj.id : null;
            updates.districtCode = distObj ? (distObj.code || distObj.district_code) : null;
            updates.block = ''; updates.blockId = null; updates.blockCode = null;
            updates.gramPanchayat = ''; updates.gpId = null; updates.gpCode = null;
            updates.village = ''; updates.vlgId = null;
        } else if (key === 'block') {
            const blockObj = (apiBlocks || []).find(b => toTitleCase(b.name || b.block_name) === normalizedValue);
            updates.blockId = blockObj ? blockObj.id : null;
            updates.blockCode = blockObj ? (blockObj.code || blockObj.block_code) : null;
            updates.gramPanchayat = ''; updates.gpId = null; updates.gpCode = null;
            updates.village = ''; updates.vlgId = null;
        } else if (key === 'gramPanchayat') {
            const gpObj = (apiGPs || []).find(g => toTitleCase(g.name || g.gp_name) === normalizedValue);
            updates.gpId = gpObj ? gpObj.id : null;
            updates.gpCode = gpObj ? (gpObj.code || gpObj.gp_code) : null;
            updates.village = ''; updates.vlgId = null;
        } else if (key === 'village') {
            const vlgObj = (apiVillages || []).find(v => toTitleCase(v.name || v.village_name || v.vlg_name) === normalizedValue);
            updates.vlgId = vlgObj ? vlgObj.id : null;
        }
        updateFilters(updates);
    };

    const handleMapViewClick = () => {
        if (metricId) {
            const typeMap = {
                'gwre': 'Ground Water Resource Estimation',
                'rainfall': 'Rainfall',
                'water_quality': 'Water Quality',
                'water_level': 'Well Inventory',
                'water_resources': 'Water Resources'
            };

            const targetType = typeMap[metricId];
            if (targetType) {
                const legendFeatureMap = {
                    'Ground Water Resource Estimation': 'Category',
                    'Rainfall': 'avg_rainfall',
                    'Water Quality': 'status',
                    'Well Inventory': 'Static WL',
                    'Water Resources': 'Category'
                };

                setFilters(prev => ({
                    ...prev,
                    type: targetType,
                    legendFeature: legendFeatureMap[targetType] || prev.legendFeature,
                    ...(targetType === 'Water Resources' ? {
                        showDams: true, showCanals: false, showWaterbodies: false, showMicro: false, showRecharge: false
                    } : {}),
                    ...(targetType === 'Water Quality' ? {
                        showEC: true, showTDS: false, showFluoride: false, showPH: false, showMarkers: true
                    } : {})
                }));
            }
        }
        setViewMode('gis');
    };

    const activeDistrict = toTitleCase(filters.district);
    const activeBlock = toTitleCase(filters.block);
    const activeGP = toTitleCase(filters.gramPanchayat);
    const activeVillage = toTitleCase(filters.village);

    return (
        <div className="location-navbar breadcrumb-mode">
            <div className="breadcrumb-wrapper">
                <button
                    className={`breadcrumb-item home-btn ${!activeDistrict ? 'active' : ''}`}
                    onClick={handleHome}
                    title="Home/Rajasthan"
                >
                    <Home size={18} />
                </button>

                <BreadcrumbMenu
                    activeDistrict={activeDistrict}
                    activeBlock={activeBlock}
                    activeGP={activeGP}
                    activeVillage={activeVillage}
                    availableDistricts={availableDistricts}
                    availableBlocks={availableBlocks}
                    availableGPs={availableGPs}
                    availableVillages={availableVillages}
                    handleFilterChange={handleFilterChange}
                    loading={loading}
                />
            </div>

            <div className="navbar-actions">
                {activeDistrict && (
                    <button className="breadcrumb-back-btn" onClick={handleBack}>
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>
                )}

                {showDetailedAnalysisBtn && (
                    <button
                        className={`detailed-analysis-btn ${isDetailedView ? 'active' : ''}`}
                        onClick={() => setIsDetailedView(!isDetailedView)}
                        title={isDetailedView ? "Back to Charts" : "Switch to Detailed Analysis"}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                            borderRadius: '8px', border: '1px solid #e2e8f0',
                            background: isDetailedView ? 'var(--metric-color, #2563eb)' : 'white',
                            color: isDetailedView ? 'white' : '#64748b',
                            cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <BarChart2 size={18} />
                        <span>Detailed Analysis</span>
                    </button>
                )}

                {viewMode !== 'gis' && (
                    <button className="gis-view-btn" onClick={handleMapViewClick} title="Switch to Map View">
                        <Map size={18} />
                        <span>Map View</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default React.memo(LocationNavbar);
