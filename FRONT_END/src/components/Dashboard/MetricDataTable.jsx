import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import Pagination from '../Common/Pagination';
import { downloadCSV, downloadPDF } from '../../utils/exportUtils';

const MetricDataTable = ({ data, analysisResults, title }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const items = data?.features || (Array.isArray(data) ? data : []);

    // 1. Memoize Headers (detect once from the first available item)
    const headers = useMemo(() => {
        const firstItem = items[0]?.properties || items[0];
        if (!firstItem) return [];
        return Object.keys(firstItem).slice(0, 10); // Show up to 10 columns for dashboard view
    }, [items]);

    // Reset to first page when data changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [items.length]);

    const paginatedItems = useMemo(() => {
        return items.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [items, currentPage, itemsPerPage]);

    const handleExport = () => {
        const flatData = items.map(item => item.properties || item);
        downloadCSV(flatData, 'Dashboard_Data_Export');
    };

    const handlePrint = () => {
        const flatData = items.map(item => item.properties || item);
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
                        {paginatedItems.length > 0 ? (
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
                totalItems={items.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default MetricDataTable;
