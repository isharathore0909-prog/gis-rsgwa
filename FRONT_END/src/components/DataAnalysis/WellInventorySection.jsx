import React, { useState, useEffect, useCallback } from 'react';
import { useWellInventoryData } from '../../hooks/useWellInventoryData';
import HydrographChart from './WellInventory/HydrographChart';
import WaterLevelChart from './WellInventory/WaterLevelChart';
import HydrographDataTable from './WellInventory/HydrographDataTable';
import WellInventoryModal from './WellInventory/WellInventoryModal';
import { downloadCSV } from '../../utils/exportUtils';
import './WellInventorySection.css';

const WellInventorySection = ({
    displayRegion,
    displayBlock,
    analysisLevel,
    globalFilters,
    selectedWell,
    selectedFeature,
    clickedLocation,
    isExpanded,
    selectedWellInventory = [],
    onToggleWellInventory,
    onClearWellInventory,
    onSetWellInventory,
    rainfallStations = []
}) => {
    const {
        loading,
        listData,
        nearbyData,
        nearbyLoading,
        rainfallData,
        rainfallLoading,
        aggregatedChartData,
        nearbyChartData,
        aquiferDistribution,
        totalWells,
        error
    } = useWellInventoryData({
        displayRegion,
        displayBlock,
        globalFilters,
        clickedLocation,
        selectedWell,
        rainfallStations
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Helpers ---

    const isSelected = useCallback((well) => {
        if (!well) return false;
        const lat = well.latitude || well.lat || well.properties?.latitude || well.properties?.lat;
        const lon = well.longitude || well.lng || well.properties?.longitude || well.properties?.lng;

        return selectedWellInventory.some(w => {
            if (well.well_id && w.well_id === well.well_id) return true;

            const wLat = w.latitude || w.lat || w.properties?.latitude || w.properties?.lat;
            const wLng = w.longitude || w.lng || w.properties?.longitude || w.properties?.lng;

            if (lat && lon && wLat && wLng) {
                return Math.abs(lat - wLat) < 0.0001 && Math.abs(lon - wLng) < 0.0001;
            }
            return false;
        });
    }, [selectedWellInventory]);

    const handleBatchDownload = useCallback(() => {
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
    }, [selectedWellInventory]);

    // --- Effects ---

    // Sync selected well from props
    useEffect(() => {
        if (selectedWell && !isSelected(selectedWell)) {
            onToggleWellInventory(selectedWell);
        }
    }, [selectedWell, isSelected, onToggleWellInventory]);

    // Auto-select nearby point on click
    useEffect(() => {
        if (clickedLocation && !nearbyLoading) {
            const { lat, lng: lon } = clickedLocation;
            let currentLoc;

            if (nearbyData) {
                let nearestAquifer = '-';
                if (listData?.length > 0) {
                    let minDist = Infinity;
                    let nearestWell = null;
                    listData.forEach(w => {
                        const wLat = w.latitude || w.lat || w.properties?.latitude || w.properties?.lat;
                        const wLng = w.longitude || w.lng || w.properties?.longitude || w.properties?.lng;
                        if (wLat && wLng) {
                            const dist = (wLat - lat) ** 2 + (wLng - lon) ** 2;
                            if (dist < minDist) {
                                minDist = dist;
                                nearestWell = w;
                            }
                        }
                    });
                    if (nearestWell) nearestAquifer = nearestWell.aquifer || nearestWell.Aquifer || nearestWell.properties?.aquifer || '-';
                }

                currentLoc = {
                    lat, lng: lon,
                    well_id: `Nearby_${lat.toFixed(2)}_${lon.toFixed(2)}`,
                    aquifer: nearestAquifer,
                    ...nearbyData
                };
            } else {
                currentLoc = {
                    lat, lng: lon,
                    well_id: `Unknown_${lat.toFixed(2)}_${lon.toFixed(2)}`,
                    aquifer: 'No Data',
                    averages: {}
                };
            }

            if (!isSelected(currentLoc) && (!selectedWell || (Math.abs(currentLoc.lat - (selectedWell.latitude || selectedWell.lat)) > 0.001))) {
                onToggleWellInventory(currentLoc);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nearbyData, clickedLocation, nearbyLoading, listData]);

    const renderBatchControls = () => {
        if (selectedWellInventory.length === 0) return null;
        return (
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
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
                    </svg>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Expand</span>
                </button>
            </div>
        );
    };

    const renderTableContent = () => {
        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        const getCellValue = (item, year) => {
            const val = item.averages ? item.averages[year]?.avg : item[`avg_${year}`];
            return (val != null && val !== '') ? parseFloat(val).toFixed(1) : '-';
        };

        return (
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
    };

    const renderContent = () => {
        if (loading || nearbyLoading) return <div className="well-inventory-loading">Loading specific area data...</div>;
        if (error) return <div className="well-inventory-error">{error}</div>;

        if (selectedFeature && selectedFeature.type === 'aquifer_feature') {
            const aquiferName = selectedFeature.Aquifer || selectedFeature.aquifer || 'Unknown Aquifer';
            const displayProps = Object.entries(selectedFeature).filter(([key]) =>
                !['type', 'fid', 'geom', 'geometry', '_leaflet_id'].includes(key.toLowerCase())
            );
            return (
                <div className="well-inventory-section detailed-view">
                    <div className="well-profile-card">
                        <div className="profile-header">
                            <div className="profile-icon" style={{ backgroundColor: '#3b82f6' }}>🌊</div>
                            <div className="profile-info"><h4>Aquifer Details</h4><p>{aquiferName}</p></div>
                        </div>
                        <div className="data-table-container" style={{ marginTop: '16px' }}>
                            <div className="table-header selection-integrated"><h5>Feature Attributes</h5>{renderBatchControls()}</div>
                            <table className="analysis-table">
                                <tbody>
                                    {displayProps.map(([key, value]) => (
                                        <tr key={key}>
                                            <td style={{ color: '#64748b' }}>{key}</td>
                                            <td style={{ textAlign: 'right' }}>{value?.toString() || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {selectedWellInventory.length > 0 && (
                        <div className="selection-summary-card">
                            <div className="table-header selection-integrated" style={{ marginBottom: '12px' }}>
                                <div className="title-group"><h5>Selected Locations Data</h5></div>
                                {renderBatchControls()}
                            </div>
                            <div className="data-table-wrapper">{renderTableContent()}</div>
                        </div>
                    )}
                </div>
            );
        }

        if (selectedWell) {
            const chartData = Array.from({ length: 10 }, (_, i) => 2015 + i).map(year => ({
                year: year.toString(),
                'Pre-Monsoon': selectedWell[`pre_${year}`] || null,
                'Post-Monsoon': selectedWell[`pst_${year}`] || null,
                'Average Water Level': (selectedWell[`pre_${year}`] || selectedWell[`pst_${year}`])
                    ? ((parseFloat(selectedWell[`pre_${year}`] || 0) + parseFloat(selectedWell[`pst_${year}`] || 0)) /
                        ((selectedWell[`pre_${year}`] ? 1 : 0) + (selectedWell[`pst_${year}`] ? 1 : 0))).toFixed(2)
                    : null,
                'Annual Rainfall': rainfallData[year.toString()] ? rainfallData[year.toString()] / 1000 : null
            }));

            return (
                <div className="well-inventory-section detailed-view">
                    <div className="well-profile-card">
                        <div className="profile-header">
                            <div className="profile-icon">📍</div>
                            <div className="profile-info">
                                <h4>{selectedWell.well_id || 'Well Details'}</h4>
                                <p>{selectedWell.village_name || selectedWell.village || 'Location Selected'}</p>
                            </div>
                        </div>
                        <div className="profile-stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Aquifer</span>
                                <span className="stat-value">{selectedWell.aquifer || 'N/A'}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Water Level Avg</span>
                                <span className="stat-value">
                                    {chartData.filter(d => d['Average Water Level']).length > 0
                                        ? (chartData.reduce((acc, curr) => acc + parseFloat(curr['Average Water Level'] || 0), 0) /
                                            chartData.filter(d => d['Average Water Level']).length).toFixed(1)
                                        : 'N/A'} m
                                </span>
                            </div>
                        </div>

                        <div className="chart-section-title">Hydrograph & Rainfall Correlation</div>
                        <HydrographChart data={chartData} isExpanded={isExpanded} />
                        <HydrographDataTable data={chartData} />
                    </div>

                    {selectedWellInventory.length > 0 && (
                        <div className="selection-summary-card">
                            <div className="table-header selection-integrated" style={{ marginBottom: '12px' }}>
                                <div className="title-group"><h5>Selected Locations Data</h5></div>
                                {renderBatchControls()}
                            </div>
                            <div className="data-table-wrapper">{renderTableContent()}</div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="well-inventory-section overview">
                <div className="card-header">
                    <div className="title-group">
                        <h5>Regional Water Level Trend</h5>
                        <span>Based on {totalWells || listData.length} observation wells</span>
                    </div>
                </div>
                {(analysisLevel === 'Village' || analysisLevel === 'Gram Panchayat') ? (
                    <HydrographChart data={aggregatedChartData} isExpanded={isExpanded} />
                ) : (
                    <WaterLevelChart data={aggregatedChartData} isExpanded={isExpanded} />
                )}
                <HydrographDataTable
                    data={aggregatedChartData}
                    showRainfall={analysisLevel === 'Village' || analysisLevel === 'Gram Panchayat'}
                />

                {selectedWellInventory.length > 0 && (
                    <div className="selection-summary-card">
                        <div className="table-header selection-integrated" style={{ marginBottom: '12px' }}>
                            <div className="title-group"><h5>Selected Locations Data</h5></div>
                            {renderBatchControls()}
                        </div>
                        <div className="data-table-wrapper">{renderTableContent()}</div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="well-inventory-container animated-entry">
            {renderContent()}
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

export default WellInventorySection;
