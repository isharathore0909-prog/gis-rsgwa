import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import api from '../../api';
import './WellInventorySection.css';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '10px' }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

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
    onSetWellInventory
}) => {
    const [loading, setLoading] = useState(false);
    const [listData, setListData] = useState([]); // Data for aggregation
    const [nearbyData, setNearbyData] = useState(null);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch List Data ONLY if not already loaded or if filters changed
    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    detailed: 'true'
                };

                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.grampanchayat = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                console.log("WellInventorySection: Fetching with params:", params);
                const response = await api.aquifer.getRecords(params);

                if (!ignore) {
                    console.log("WellInventorySection: Response:", response);
                    const records = Array.isArray(response) ? response : (response.results || []);
                    setListData(records);
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching well inventory:", err);
                    setError("Failed to load well inventory data.");
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [displayRegion, displayBlock, globalFilters]);

    // Fetch Nearby Data when location is clicked
    useEffect(() => {
        let ignore = false;
        if (!clickedLocation || selectedWell) {
            setNearbyData(null);
            return;
        }

        const fetchNearbyData = async () => {
            setNearbyLoading(true);
            try {
                const response = await api.aquifer.getNearby({
                    latitude: clickedLocation.lat,
                    longitude: clickedLocation.lng,
                    radius: 0.1 // ~10km
                });

                if (!ignore) {
                    console.log("WellInventorySection: Nearby Data:", response);
                    if (response && response.averages) {
                        setNearbyData(response);
                    } else {
                        setNearbyData(null);
                    }
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching nearby aquifer data:", err);
                    setNearbyData(null);
                }
            } finally {
                if (!ignore) {
                    setNearbyLoading(false);
                }
            }
        };

        fetchNearbyData();
        return () => { ignore = true; };
    }, [clickedLocation, selectedWell]);

    // Prepare Aggregated Chart Data (Average Water Levels)
    const aggregatedChartData = useMemo(() => {
        if (!listData || listData.length === 0) return [];

        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => {
            let preSum = 0;
            let preCount = 0;
            let pstSum = 0;
            let pstCount = 0;

            listData.forEach(record => {
                const preVal = record[`pre_${year}`];
                const pstVal = record[`pst_${year}`];

                if (preVal !== null && preVal !== undefined) {
                    preSum += parseFloat(preVal);
                    preCount++;
                }
                if (pstVal !== null && pstVal !== undefined) {
                    pstSum += parseFloat(pstVal);
                    pstCount++;
                }
            });

            return {
                year: year.toString(),
                'Pre-Monsoon': preCount > 0 ? (preSum / preCount).toFixed(2) : null,
                'Post-Monsoon': pstCount > 0 ? (pstSum / pstCount).toFixed(2) : null
            };
        });
    }, [listData]);

    // Prepare Nearby Chart Data
    const nearbyChartData = useMemo(() => {
        if (!nearbyData || !nearbyData.averages) return [];

        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
        return years.map(year => ({
            year: year.toString(),
            'Pre-Monsoon': nearbyData.averages[year]?.pre?.toFixed(2) || null,
            'Post-Monsoon': nearbyData.averages[year]?.pst?.toFixed(2) || null
        }));
    }, [nearbyData]);

    // Prepare Aquifer Distribution Data
    const aquiferDistribution = useMemo(() => {
        if (!listData || listData.length === 0) return [];

        const counts = {};
        listData.forEach(record => {
            const aq = record.aquifer || 'Unknown';
            counts[aq] = (counts[aq] || 0) + 1;
        });

        // Convert to array and sort
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [listData]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Helper to download single record as CSV
    const handleDownload = (data, filename = 'data') => {
        if (!data) return;
        const csvContent = "data:text/csv;charset=utf-8,"
            + Object.entries(data).map(([k, v]) => `${k},${v}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to download array of records as CSV
    const handleDownloadCSV = (data, filename = 'well_history_data') => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Add Header Row
        csvRows.push(headers.map(h => `"${h}"`).join(","));

        // Add Data Rows
        data.forEach(row => {
            const values = headers.map(header => {
                const val = row[header];
                const escaped = ('' + (val === null || val === undefined ? "" : val)).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(","));
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Check if current feature/location is in selection
    const isSelected = (well) => {
        if (!well) return false;
        return selectedWellInventory.some(w =>
            (well.well_id && w.well_id === well.well_id) ||
            (well.lat && w.lat === well.lat && well.lng === well.lng) ||
            (well.latitude && w.latitude === well.latitude && w.longitude === well.longitude)
        );
    };

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
            const aquifer = well.aquifer || well.Aquifer || well.properties?.aquifer || well.properties?.Aquifer || '-';

            years.forEach(year => {
                batchData.push({
                    'S.No.': globalIndex++,
                    'Well ID': wellId,
                    'Lat': typeof lat === 'number' ? lat.toFixed(6) : lat,
                    'Lon': typeof lon === 'number' ? lon.toFixed(6) : lon,
                    'Village': village,
                    'Aquifer': aquifer,
                    'Year': year,
                    'Pre-Monsoon (m bgl)': well[`pre_${year}`] || well.averages?.[year]?.pre || '-',
                    'Post-Monsoon (m bgl)': well[`pst_${year}`] || well.averages?.[year]?.pst || '-'
                });
            });
        });

        handleDownloadCSV(batchData, 'well_inventory_batch_export');
    };

    // --- Automatic Selection Logic ---
    useEffect(() => {
        if (selectedWell && !isSelected(selectedWell)) {
            onToggleWellInventory(selectedWell);
        }
    }, [selectedWell]);

    useEffect(() => {
        if (nearbyData && clickedLocation && !selectedFeature) {
            const lat = clickedLocation.lat;
            const lon = clickedLocation.lng;

            // Find nearest well to get Aquifer info
            let nearestAquifer = '-';
            if (listData && listData.length > 0) {
                let minDist = Infinity;
                let nearestWell = null;

                listData.forEach(w => {
                    const wLat = w.latitude || w.lat || w.properties?.latitude || w.properties?.lat;
                    const wLng = w.longitude || w.lng || w.properties?.longitude || w.properties?.lng;

                    if (wLat && wLng) {
                        // Simple Euclidean distance is sufficient for finding nearest in local area
                        const dist = Math.pow(wLat - lat, 2) + Math.pow(wLng - lon, 2);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestWell = w;
                        }
                    }
                });

                if (nearestWell) {
                    nearestAquifer = nearestWell.aquifer || nearestWell.Aquifer || nearestWell.properties?.aquifer || nearestWell.properties?.Aquifer || '-';
                }
            }

            const currentLoc = {
                lat,
                lng: lon,
                well_id: `Nearby_${lat.toFixed(2)}_${lon.toFixed(2)}`,
                aquifer: nearestAquifer,
                ...nearbyData
            };
            if (!isSelected(currentLoc)) {
                onToggleWellInventory(currentLoc);
            }
        }
    }, [nearbyData, clickedLocation, selectedFeature, listData]);

    // --- Sub-renderers for UI Parts ---
    const renderBatchControls = () => {
        if (selectedWellInventory.length === 0) return null;

        return (
            <div className="table-batch-actions-compact">
                <button
                    className="batch-action-btn-primary"
                    onClick={handleBatchDownload}
                    title="Download historical data for all selected locations"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
                <button
                    className="batch-action-btn-secondary"
                    onClick={() => setIsModalOpen(true)}
                    title="View full screen"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M9 21H3v-6" />
                        <path d="M21 3l-7 7" />
                        <path d="M3 21l7-7" />
                    </svg>
                </button>
            </div>
        );
    };

    const renderTableContent = () => {
        const years = Array.from({ length: 10 }, (_, i) => 2015 + i);

        const getCellValue = (item, year, type) => {
            if (item.averages) {
                const val = item.averages[year]?.[type === 'pre' ? 'pre' : 'pst'];
                return (val !== null && val !== undefined) ? parseFloat(val).toFixed(1) : '-';
            }
            const key = `${type === 'pre' ? 'pre' : 'pst'}_${year}`;
            const val = item[key];
            return (val !== null && val !== undefined && val !== '') ? parseFloat(val).toFixed(1) : '-';
        };

        return (
            <table className="analysis-table wide-table">
                <thead>
                    <tr>
                        <th rowSpan="2" className="col-check">
                            <input
                                type="checkbox"
                                checked={true}
                                onChange={onClearWellInventory}
                                title="Clear all"
                            />
                        </th>
                        <th rowSpan="2" className="col-sno">S.No.</th>
                        <th rowSpan="2" className="col-lat">Lat</th>
                        <th rowSpan="2" className="col-lon">Lon</th>
                        <th rowSpan="2" className="col-aquifer">Aquifer</th>
                        {years.map(year => (
                            <th key={year} colSpan="2" className="year-header">{year}</th>
                        ))}
                    </tr>
                    <tr>
                        {years.map(year => (
                            <React.Fragment key={year}>
                                <th className="sub-header pre">Pr(m)</th>
                                <th className="sub-header pst">Ps(m)</th>
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {selectedWellInventory.map((item, idx) => {
                        const lat = item.latitude || item.lat || item.properties?.latitude || item.properties?.lat || '-';
                        const lon = item.longitude || item.lng || item.properties?.longitude || item.properties?.lng || '-';
                        const aquifer = item.aquifer || item.Aquifer || item.properties?.aquifer || item.properties?.Aquifer || '-';
                        return (
                            <tr key={idx}>
                                <td className="col-check">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        onChange={() => onToggleWellInventory(item)}
                                    />
                                </td>
                                <td className="col-sno">{idx + 1}</td>
                                <td className="col-lat">{typeof lat === 'number' ? lat.toFixed(4) : lat}</td>
                                <td className="col-lon">{typeof lon === 'number' ? lon.toFixed(4) : lon}</td>
                                <td className="col-aquifer">{aquifer}</td>
                                {years.map(year => (
                                    <React.Fragment key={year}>
                                        <td className="data-cell pre">{getCellValue(item, year, 'pre')}</td>
                                        <td className="data-cell pst">{getCellValue(item, year, 'pst')}</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const renderFullScreenModal = () => {
        if (!isModalOpen) return null;

        return ReactDOM.createPortal(
            <div className="well-inventory-modal-overlay">
                <div className="well-inventory-modal-content">
                    <div className="modal-header">
                        <h2>Selected Locations Data</h2>
                        <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="batch-action-btn-primary"
                                onClick={handleBatchDownload}
                                title="Download historical data"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span>Export Data</span>
                            </button>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)} title="Close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="modal-body">
                        <div className="data-table-wrapper">
                            {renderTableContent()}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    const renderSelectionSummaryTable = () => {
        if (selectedWellInventory.length === 0) return null;

        return (
            <div className="selection-summary-card">
                <div className="table-header selection-integrated" style={{ marginBottom: '12px' }}>
                    <div className="title-group">
                        <h5>Selected Locations Data</h5>
                    </div>
                    {renderBatchControls()}
                </div>
                <div className="data-table-wrapper">
                    {renderTableContent()}
                </div>
            </div>
        );
    };

    const renderMainContent = () => {
        if (loading || nearbyLoading) {
            return <div className="well-inventory-loading">Loading specific area data...</div>;
        }

        if (error) {
            return <div className="well-inventory-error">{error}</div>;
        }

        // 1. Selected Aquifer Feature View
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
                            <div className="profile-info">
                                <h4>Aquifer Details</h4>
                                <p>{aquiferName}</p>
                            </div>
                        </div>

                        <div className="data-table-container" style={{ marginTop: '16px' }}>
                            <div className="table-header selection-integrated">
                                <h5>Feature Attributes</h5>
                                {renderBatchControls()}
                            </div>
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
                    {renderSelectionSummaryTable()}
                </div>
            );
        }

        // 2. Selected Well View
        if (selectedWell) {
            const chartData = (() => {
                const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
                return years.map(year => ({
                    year: year.toString(),
                    'Pre-Monsoon': selectedWell[`pre_${year}`],
                    'Post-Monsoon': selectedWell[`pst_${year}`]
                }));
            })();

            const lat = selectedWell.latitude || selectedWell.lat || '-';
            const lon = selectedWell.longitude || selectedWell.lng || '-';

            return (
                <div className="well-inventory-section detailed-view">
                    <div className="well-profile-card">
                        <div className="profile-header">
                            <div className="profile-icon">💧</div>
                            <div className="profile-info">
                                <h4>{selectedWell.well_id}</h4>
                                <p>{selectedWell.village_name || selectedWell.village?.name || 'Unknown Village'}, {selectedWell.block || selectedWell.taluka || '-'}</p>
                            </div>
                        </div>

                        <div className="profile-stats-grid">
                            <div className="stat-item">
                                <label>Depth</label>
                                <strong>{selectedWell.well_depth ? `${selectedWell.well_depth} m` : 'N/A'}</strong>
                            </div>
                            <div className="stat-item">
                                <label>Aquifer</label>
                                <strong>{selectedWell.aquifer || 'N/A'}</strong>
                            </div>
                            <div className="stat-item">
                                <label>District</label>
                                <strong>{selectedWell.district || '-'}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="well-chart-container" style={{ height: isExpanded ? '400px' : '300px', marginBottom: '16px' }}>
                        <h5>Water Level History (2015-2024)</h5>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={5} />
                                    <YAxis
                                        label={{ value: 'Depth (m bgl)', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: '#94a3b8' }, dx: 0 }}
                                        reversed={true}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        allowEscapeViewBox={{ x: true, y: true }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                                        formatter={(value) => [`${value} m`, 'Depth']}
                                        labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                                    <Line name="Pre-Monsoon" type="monotone" dataKey="Pre-Monsoon" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
                                    <Line name="Post-Monsoon" type="monotone" dataKey="Post-Monsoon" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {renderSelectionSummaryTable()}
                </div>
            );
        }

        // 3. Nearby Estimation View
        if (nearbyData && !selectedFeature) {
            const lat = clickedLocation.lat;
            const lon = clickedLocation.lng;
            const currentLoc = { lat, lng: lon, well_id: `Nearby_${lat.toFixed(2)}_${lon.toFixed(2)}`, ...nearbyData };

            return (
                <div className="well-inventory-section detailed-view nearby-view">
                    <div className="well-profile-card nearby-profile-card">
                        <div className="profile-header">
                            <div className="profile-icon">📍</div>
                            <div className="profile-info">
                                <h4>Nearby Estimation</h4>
                                <p>Lat: {lat.toFixed(4)}, Lon: {lon.toFixed(4)}</p>
                            </div>
                        </div>
                        <div className="profile-stats-grid">
                            <div className="stat-item"><label>Wells in Radius</label><strong>{nearbyData.count}</strong></div>
                            <div className="stat-item"><label>Radius</label><strong>~10 km</strong></div>
                            <div className="stat-item"><label>Data Type</label><strong>Spatial Average</strong></div>
                        </div>
                    </div>

                    <div className="well-chart-container" style={{ height: isExpanded ? '400px' : '300px', marginBottom: '16px' }}>
                        <h5>Estimated Water Level (Avg of {nearbyData.count} Wells)</h5>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={nearbyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis reversed={true} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip allowEscapeViewBox={{ x: true, y: true }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }} formatter={(value) => [`${value} m`, 'Avg Depth']} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                                    <Line name="Pre-Monsoon (Avg)" type="monotone" dataKey="Pre-Monsoon" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                                    <Line name="Post-Monsoon (Avg)" type="monotone" dataKey="Post-Monsoon" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {renderSelectionSummaryTable()}
                </div>
            );
        }

        // 4. Default Dashboard View
        return (
            <div className="well-inventory-section dashboard-view">
                <div className="well-count-header">
                    <div className="title-group">
                        <h3>Regional Overview</h3>
                        <span className="region-badge">{listData.length} Wells</span>
                    </div>
                    {renderBatchControls()}
                </div>

                {listData.length > 0 ? (
                    <>
                        <div className="aggregated-chart-section">
                            <h5>Average Water Level Trends</h5>
                            <div className="chart-wrapper small-chart" style={{ height: isExpanded ? '300px' : '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={aggregatedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis reversed={true} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                        <Tooltip
                                            allowEscapeViewBox={{ x: false, y: false }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}
                                            formatter={(value) => [`${value} m`, 'Depth']}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                        <Line type="monotone" dataKey="Pre-Monsoon" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                                        <Line type="monotone" dataKey="Post-Monsoon" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="aquifer-stats-card">
                            <h5>Aquifer Distribution</h5>
                            <div className="pie-chart-wrapper" style={{ minHeight: isExpanded ? '240px' : '160px' }}>
                                <ResponsiveContainer width="100%" height={isExpanded ? 240 : 160}>
                                    <PieChart>
                                        <Pie data={aquiferDistribution} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} innerRadius={40} outerRadius={60} fill="#8884d8" paddingAngle={5} dataKey="value">
                                            {aquiferDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip allowEscapeViewBox={{ x: true, y: true }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="aquifer-legend">
                                    {aquiferDistribution.map((entry, index) => (
                                        <div key={index} className="legend-item"><span className="color-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span><span>{entry.name}: {entry.value}</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {renderSelectionSummaryTable()}

                    </>
                ) : (
                    <div className="well-inventory-empty" style={{ flexDirection: 'column', gap: '10px', padding: '40px 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📉</div>
                        <p style={{ margin: 0, color: '#94a3b8' }}>Data is not available. Please select another location.</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="well-inventory-section-wrapper">
            {renderMainContent()}
            {renderFullScreenModal()}
        </div>
    );
};

export default WellInventorySection;
