import React from 'react';
import { ChevronRight } from 'lucide-react';

export const BreadcrumbSelect = ({ value, options, onChange, placeholder, className = "breadcrumb-select", loading }) => {
    if (!options || (options.length === 0 && !loading)) return null;

    return (
        <>
            <ChevronRight className="breadcrumb-separator" size={16} />
            <select
                className={className}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading && options.length === 0}
            >
                <option value="">{loading && options.length === 0 ? "Loading..." : placeholder}</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </>
    );
};

const BreadcrumbMenu = ({
    activeDistrict, activeBlock, activeGP, activeVillage,
    availableDistricts, availableBlocks, availableGPs, availableVillages,
    handleFilterChange, loading
}) => {
    return (
        <div className="breadcrumb-container">
            {/* Active Path Breadcrumbs */}
            {activeDistrict && (
                <BreadcrumbSelect
                    value={activeDistrict}
                    options={availableDistricts}
                    onChange={(val) => handleFilterChange('district', val)}
                    placeholder="Select District"
                    loading={loading}
                />
            )}

            {activeBlock && (
                <BreadcrumbSelect
                    value={activeBlock}
                    options={availableBlocks}
                    onChange={(val) => handleFilterChange('block', val)}
                    placeholder="Select Block"
                    loading={loading}
                />
            )}

            {activeGP && (
                <BreadcrumbSelect
                    value={activeGP}
                    options={availableGPs}
                    onChange={(val) => handleFilterChange('gramPanchayat', val)}
                    placeholder="Select GP"
                    loading={loading}
                />
            )}

            {activeVillage && (
                <BreadcrumbSelect
                    value={activeVillage}
                    options={availableVillages}
                    onChange={(val) => handleFilterChange('village', val)}
                    placeholder="Select Village"
                    loading={loading}
                />
            )}

            {/* Next Level Selection Dropdowns */}
            {!activeDistrict && (
                <BreadcrumbSelect
                    value=""
                    options={availableDistricts}
                    onChange={(val) => handleFilterChange('district', val)}
                    placeholder="Select District..."
                    className="breadcrumb-new-select"
                    loading={loading}
                />
            )}
            {activeDistrict && !activeBlock && (
                <BreadcrumbSelect
                    value=""
                    options={availableBlocks}
                    onChange={(val) => handleFilterChange('block', val)}
                    placeholder="Select Block..."
                    className="breadcrumb-new-select"
                    loading={loading}
                />
            )}
            {activeBlock && !activeGP && (
                <BreadcrumbSelect
                    value=""
                    options={availableGPs}
                    onChange={(val) => handleFilterChange('gramPanchayat', val)}
                    placeholder="Select GP..."
                    className="breadcrumb-new-select"
                    loading={loading}
                />
            )}
            {activeGP && !activeVillage && (
                <BreadcrumbSelect
                    value=""
                    options={availableVillages}
                    onChange={(val) => handleFilterChange('village', val)}
                    placeholder="Select Village..."
                    className="breadcrumb-new-select"
                    loading={loading}
                />
            )}
        </div>
    );
};

export default React.memo(BreadcrumbMenu);
