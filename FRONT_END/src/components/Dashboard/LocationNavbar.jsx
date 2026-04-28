import { Map, Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useLocations } from '../../hooks/ui/useLocations';
import { toTitleCase } from '../../utils/namingUtils';
import './LocationNavbar.css';

const LocationNavbar = ({ metricId }) => {
    const { filters, updateFilters, setViewMode, viewMode, setFilters } = useAppContext();
    const {
        availableDistricts,
        availableBlocks,
        availableGPs,
        availableVillages,
        apiDistricts,
        apiBlocks,
        apiGPs,
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
            updates.block = '';
            updates.blockId = null;
            updates.blockCode = null;
            updates.gramPanchayat = '';
            updates.gpId = null;
            updates.gpCode = null;
            updates.village = '';
            updates.vlgId = null;
        } else if (key === 'block') {
            const blockObj = (apiBlocks || []).find(b => toTitleCase(b.name || b.block_name) === normalizedValue);
            updates.blockId = blockObj ? blockObj.id : null;
            updates.blockCode = blockObj ? (blockObj.code || blockObj.block_code) : null;
            updates.gramPanchayat = '';
            updates.gpId = null;
            updates.gpCode = null;
            updates.village = '';
            updates.vlgId = null;
        } else if (key === 'gramPanchayat') {
            const gpObj = (apiGPs || []).find(g => toTitleCase(g.name || g.gp_name) === normalizedValue);
            updates.gpId = gpObj ? gpObj.id : null;
            updates.gpCode = gpObj ? (gpObj.code || gpObj.gp_code) : null;
            updates.village = '';
            updates.vlgId = null;
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
                    // If switching to Water Resources, enable only the default sub-layer
                    ...(targetType === 'Water Resources' ? {
                        showDams: true,
                        showCanals: false,
                        showWaterbodies: false,
                        showMicro: false,
                        showRecharge: false
                    } : {}),
                    // Ensure Water Quality also defaults to EC only
                    ...(targetType === 'Water Quality' ? {
                        showEC: true,
                        showTDS: false,
                        showFluoride: false,
                        showPH: false,
                        showMarkers: true
                    } : {})
                }));
            }
        }
        setViewMode('gis');
    };

    // Ensure values for select match the options (Title Case)
    const activeDistrict = toTitleCase(filters.district);
    const activeBlock = toTitleCase(filters.block);
    const activeGP = toTitleCase(filters.gramPanchayat);
    const activeVillage = toTitleCase(filters.village);

    return (
        <div className="location-navbar breadcrumb-mode">
            <div className="breadcrumb-container">
                <button
                    className={`breadcrumb-item home-btn ${!activeDistrict ? 'active' : ''}`}
                    onClick={handleHome}
                    title="Home/Rajasthan"
                >
                    <Home size={18} />
                </button>

                {activeDistrict && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-select"
                            value={activeDistrict}
                            onChange={(e) => handleFilterChange('district', e.target.value)}
                        >
                            <option value="">Select District</option>
                            {availableDistricts.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </>
                )}

                {activeBlock && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-select"
                            value={activeBlock}
                            onChange={(e) => handleFilterChange('block', e.target.value)}
                        >
                            <option value="">Select Block</option>
                            {availableBlocks.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </>
                )}

                {activeGP && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-select"
                            value={activeGP}
                            onChange={(e) => handleFilterChange('gramPanchayat', e.target.value)}
                        >
                            <option value="">Select GP</option>
                            {availableGPs.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </>
                )}

                {activeVillage && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-select"
                            value={activeVillage}
                            onChange={(e) => handleFilterChange('village', e.target.value)}
                        >
                            <option value="">Select Village</option>
                            {availableVillages.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </>
                )}

                {/* Next Level Selection Dropdown */}
                {!activeDistrict && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-new-select"
                            onChange={(e) => handleFilterChange('district', e.target.value)}
                            value=""
                        >
                            <option value="">Select District...</option>
                            {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </>
                )}
                {activeDistrict && !activeBlock && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-new-select"
                            onChange={(e) => handleFilterChange('block', e.target.value)}
                            value=""
                        >
                            <option value="">Select Block...</option>
                            {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </>
                )}
                {activeBlock && !activeGP && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-new-select"
                            onChange={(e) => handleFilterChange('gramPanchayat', e.target.value)}
                            value=""
                        >
                            <option value="">Select GP...</option>
                            {availableGPs.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </>
                )}
                {activeGP && !activeVillage && (
                    <>
                        <ChevronRight className="breadcrumb-separator" size={16} />
                        <select
                            className="breadcrumb-new-select"
                            onChange={(e) => handleFilterChange('village', e.target.value)}
                            value=""
                        >
                            <option value="">Select Village...</option>
                            {availableVillages.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </>
                )}
            </div>

            <div className="navbar-actions">
                {activeDistrict && (
                    <button className="breadcrumb-back-btn" onClick={handleBack}>
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>
                )}

                {viewMode !== 'gis' && (
                    <button
                        className="gis-view-btn"
                        onClick={handleMapViewClick}
                        title="Switch to Map View"
                    >
                        <Map size={18} />
                        <span>Map View</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default LocationNavbar;
