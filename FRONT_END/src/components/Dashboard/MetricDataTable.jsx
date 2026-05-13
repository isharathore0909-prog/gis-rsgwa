import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import Pagination from '../Common/Pagination';
import { downloadCSV, downloadPDF } from '../../utils/exportUtils';

import Spinner from '../Common/ChartSpinner';

const MetricDataTable = ({ data, analysisResults, title, fetchData }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [serverData, setServerData] = useState({ items: [], count: 0, loading: false });
    const itemsPerPage = 10;

    // Fallback client-side items
    const clientItems = data?.features || (Array.isArray(data) ? data : []);

    // 1. Memoize Headers
    const headers = useMemo(() => {
        const firstItem = serverData.items[0] || clientItems[0]?.properties || clientItems[0];
        if (!firstItem) return [];
        return Object.keys(firstItem.properties || firstItem).slice(0, 10);
    }, [serverData.items, clientItems]);

    // Fetch data when page changes OR filters (fetchData) change
    React.useEffect(() => {
        let isMounted = true;
        if (fetchData) {
            setServerData(prev => ({ ...prev, loading: true }));
            fetchData(currentPage, itemsPerPage).then(res => {
                if (isMounted) {
                    if (res) {
                        setServerData({ items: res.items, count: res.count, loading: false });
                    } else {
                        setServerData(prev => ({ ...prev, loading: false }));
                    }
                }
            }).catch(() => {
                if (isMounted) setServerData(prev => ({ ...prev, loading: false }));
            });
        }
        return () => { isMounted = false; };
    }, [currentPage, fetchData, itemsPerPage]);

    // Reset to first page when client data source changes (if pure client side)
    React.useEffect(() => {
        if (!fetchData) setCurrentPage(1);
    }, [clientItems.length, fetchData]);

    const paginatedItems = useMemo(() => {
        if (fetchData) return serverData.items;
        return clientItems.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [clientItems, serverData.items, currentPage, itemsPerPage, fetchData]);

    const totalCount = fetchData ? serverData.count : clientItems.length;

    const handleExport = () => {
        // Fallback to clientItems if server export isn't implemented here
        const sourceData = fetchData && serverData.count <= 1000 ? serverData.items : clientItems;
        const flatData = sourceData.map(item => item.properties || item);
        downloadCSV(flatData, 'Dashboard_Data_Export');
    };

    const handlePrint = () => {
        const sourceData = fetchData && serverData.count <= 1000 ? serverData.items : clientItems;
        const flatData = sourceData.map(item => item.properties || item);
        downloadPDF(flatData, `${title}_Data_PDF`, `${title} - Data Inventory`);
    };

    return (
        <div className="table-section">
            <div className="table-header">
                <h3>Attribute Data Inventory</h3>
                <div className="table-header-controls">
                    <div className="table-actions-group">
                        <div className="search-wrapper">
                            <Icons.Search size={16} className="search-icon" />
                            <input type="text" placeholder="Search data..." className="search-box" />
                        </div>
                        <button className="icon-action-btn" title="Export CSV" onClick={handleExport}>
                            <Icons.FileDown size={18} />
                        </button>
                        <button className="icon-action-btn" title="Print View" onClick={handlePrint}>
                            <Icons.Printer size={18} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="table-wrapper">
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>S.No</th>
                            {headers.map(header => (
                                <th key={header}>{header.replace(/_/g, ' ')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {serverData.loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                    <Spinner size={32} color="#3b82f6" />
                                    <div style={{ marginTop: '10px' }}>Loading {title} Data...</div>
                                </td>
                            </tr>
                        ) : paginatedItems.length > 0 ? (
                            paginatedItems.map((item, index) => {
                                const globalIdx = (currentPage - 1) * itemsPerPage + index;
                                const properties = item.properties || item;
                                return (
                                    <tr key={item.id || item.ID || globalIdx}>
                                        <td style={{ fontWeight: 600, color: '#64748b' }}>{globalIdx + 1}</td>
                                        {headers.map(header => (
                                            <td key={`${globalIdx}-${header}`}>
                                                {header.toLowerCase().includes('category') || header.toLowerCase().includes('status') ? (
                                                    <span className={`badge ${String(properties[header] || 'unknown').toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {properties[header]}
                                                    </span>
                                                ) : (
                                                    String(properties[header] ?? '---')
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                    {analysisResults?.gwreLoading ? "Loading latest metrics..." : "No detailed records available for this selection."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default MetricDataTable;
