import React, { useState } from 'react';
import { downloadCSV } from '../../../utils/exportUtils';
import WellInventoryModal from './WellInventoryModal';

export const WellSelectionTable = ({
    selectedWellInventory,
    onClearWellInventory,
    onToggleWellInventory
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!selectedWellInventory || selectedWellInventory.length === 0) return null;

    const handleBatchDownload = () => {
        if (selectedWellInventory.length === 0) return;
        const batchData = [];
        let globalIndex = 1;

        selectedWellInventory.forEach(well => {
            const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
            const lat = well.latitude || well.lat || well.properties?.latitude || well.properties?.lat || '-';
            const lon = well.longitude || well.lng || well.properties?.longitude || well.properties?.lng || '-';
            const village = well.village_name || well.village?.name || well.properties?.village_name || well.properties?.Village || '-';
            const wellId = well.well_id || well.properties?.['Well ID'] || well.properties?.well_id || 'N/A';

            years.forEach(year => {
                batchData.push({
                    'S.No.': globalIndex++,
                    'Well ID': wellId,
                    'Lat': typeof lat === 'number' ? lat.toFixed(6) : lat,
                    'Lon': typeof lon === 'number' ? lon.toFixed(6) : lon,
                    'Village': village,
                    'Year': year,
                    'Average Water Level (m bgl)': well[`avg_${year}`] || well.averages?.[year]?.avg || '-',
                    'Pre-Monsoon (m bgl)': well[`pre_${year}`] || well.averages?.[year]?.pre || '-',
                    'Post-Monsoon (m bgl)': well[`pst_${year}`] || well.averages?.[year]?.pst || '-'
                });
            });
        });
        downloadCSV(batchData, 'well_inventory_batch_export');
    };

    const getCellValue = (item, year) => {
        const val = item.averages ? item.averages[year]?.avg : item[`avg_${year}`];
        return (val != null && val !== '') ? parseFloat(val).toFixed(1) : '-';
    };

    const years = Array.from({ length: 10 }, (_, i) => 2015 + i);

    const renderTableContent = () => (
        <table className="analysis-table wide-table">
            <thead>
                <tr>
                    <th className="col-check">
                        <input
                            type="checkbox"
                            checked={selectedWellInventory.length > 0}
                            onChange={onClearWellInventory}
                            title="Clear all"
                        />
                    </th>
                    <th className="col-sno">S.No.</th>
                    <th className="col-lat">Lat</th>
                    <th className="col-lon">Lon</th>
                    {years.map(year => <th key={year} className="year-header">{year} (Avg)</th>)}
                </tr>
            </thead>
            <tbody>
                {selectedWellInventory.map((item, idx) => {
                    const lat = item.latitude || item.lat || item.properties?.latitude || '-';
                    const lon = item.longitude || item.lng || item.properties?.longitude || '-';
                    return (
                        <tr key={idx}>
                            <td className="col-check">
                                <input type="checkbox" checked={true} onChange={() => onToggleWellInventory(item)} />
                            </td>
                            <td className="col-sno">{idx + 1}</td>
                            <td className="col-lat">{typeof lat === 'number' ? lat.toFixed(4) : lat}</td>
                            <td className="col-lon">{typeof lon === 'number' ? lon.toFixed(4) : lon}</td>
                            {years.map(year => (
                                <td key={year} className="data-cell avg">{getCellValue(item, year)}</td>
                            ))}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <div className="selection-summary-card">
            <div className="table-header selection-integrated" style={{ marginBottom: '12px' }}>
                <div className="title-group"><h5>Selected Locations Data</h5></div>
                <div className="table-batch-actions-compact">
                    <button className="batch-action-btn-primary" onClick={handleBatchDownload} title="Download historical data">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="batch-action-btn-secondary"
                        onClick={() => setIsModalOpen(true)}
                        title="View full screen"
                        style={{
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '6px', padding: '6px 12px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
                        </svg>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Expand</span>
                    </button>
                </div>
            </div>
            <div className="data-table-wrapper">
                {renderTableContent()}
            </div>

            <WellInventoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedWellInventory={selectedWellInventory}
                handleBatchDownload={handleBatchDownload}
                renderTableContent={renderTableContent}
            />
        </div>
    );
};
