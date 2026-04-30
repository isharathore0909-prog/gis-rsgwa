import React, { useState, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import Pagination from '../Common/Pagination';
import { downloadCSV, downloadPDF } from '../../utils/exportUtils';
import './WaterResourcesTables.css';

const TableCard = React.memo(({ title, data = [], columns = [], loading = false }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Reset page when data changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    const paginatedItems = useMemo(() => {
        return data.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [data, currentPage, itemsPerPage]);

    const handleExportCSV = useCallback(() => {
        const flatData = data.map(item => item.properties || item);
        downloadCSV(flatData, `${title}_Data_Export`);
    }, [data, title]);

    const handleExportPDF = useCallback(() => {
        const flatData = data.map(item => item.properties || item);
        downloadPDF(flatData, `${title}_Data_PDF`, `${title} Data Inventory`);
    }, [data, title]);

    return (
        <div className="table-card">
            <div className="table-card-header">
                <div className="header-left">
                    <h4>{title}</h4>
                    <span className="count-badge">{data.length}</span>
                </div>
                <div className="header-actions">
                    <button className="icon-action-btn-sm" title="Export CSV" onClick={handleExportCSV}>
                        <Icons.FileDown size={14} />
                    </button>
                    <button className="icon-action-btn-sm" title="Print PDF" onClick={handleExportPDF}>
                        <Icons.Printer size={14} />
                    </button>
                </div>
            </div>
            <div className="table-card-content">
                {loading ? (
                    <div className="table-loading">Loading {title}...</div>
                ) : data.length === 0 ? (
                    <div className="table-empty">No {title.toLowerCase()} found.</div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    {columns.map(col => (
                                        <th key={col.key}>{col.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map((row, idx) => {
                                    const rowKey = row.id || row.ID || `row-${(currentPage - 1) * itemsPerPage + idx}`;
                                    return (
                                        <tr key={rowKey}>
                                            {columns.map(col => (
                                                <td key={`${rowKey}-${col.key}`}>
                                                    {row.properties?.[col.key] || row[col.key] || '---'}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={data.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

const WaterResourcesTables = ({
    dams = [],
    waterbodies = [],
    canals = [],
    micro = [],
    rechargeData = [],
    loading = {}
}) => {

    // Column definitions for each table type
    const damColumns = [
        { key: 'Name', label: 'Dam Name' },
        { key: 'River', label: 'River' },
        { key: 'Basin', label: 'Basin' },
        { key: 'District', label: 'District' }
    ];

    const waterbodyColumns = [
        { key: 'Name', label: 'Name' },
        { key: 'Type', label: 'Type' },
        { key: 'District', label: 'District' },
        { key: 'Block', label: 'Block' }
    ];

    const canalColumns = [
        { key: 'Name', label: 'Canal Name' },
        { key: 'Type', label: 'Type' },
        { key: 'District', label: 'District' }
    ];

    const microColumns = [
        { key: 'Name', label: 'Structure Name' },
        { key: 'District', label: 'District' },
        { key: 'Block', label: 'Block' },
        { key: 'Village', label: 'Village' }
    ];

    const rechargeColumns = [
        { key: 'structure_name', label: 'Name' },
        { key: 'district', label: 'District' },
        { key: 'block', label: 'Block' },
        { key: 'status', label: 'Status' }
    ];

    return (
        <div className="water-resources-grid">
            <div className="grid-row">
                <TableCard
                    title="Dams"
                    data={dams}
                    columns={damColumns}
                    loading={loading.dams}
                />
                <TableCard
                    title="Waterbodies"
                    data={waterbodies}
                    columns={waterbodyColumns}
                    loading={loading.waterbodies}
                />
            </div>
            <div className="grid-row">
                <TableCard
                    title="Canals"
                    data={canals}
                    columns={canalColumns}
                    loading={loading.canals}
                />
                <TableCard
                    title="Micro Structures"
                    data={micro}
                    columns={microColumns}
                    loading={loading.micro}
                />
            </div>
            <div className="grid-row full-width">
                <TableCard
                    title="Recharge Structures"
                    data={rechargeData}
                    columns={rechargeColumns}
                    loading={loading.recharge}
                />
            </div>
        </div>
    );
};

export default WaterResourcesTables;
