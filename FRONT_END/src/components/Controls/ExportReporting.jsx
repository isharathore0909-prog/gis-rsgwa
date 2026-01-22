import React from 'react';
import { IconDownload, IconPrinter } from '../Icons';

const ExportReporting = ({ handleExportData, handleMapExport, filters }) => {
    const showPdfButton = ['Ground Water Resource Estimation', 'Rainfall', 'Aquifer'].includes(filters?.type);

    return (
        <>
            <button className="download-btn" onClick={handleExportData}>
                <IconDownload />
                <span>Get Your Data</span>
            </button>
            {showPdfButton && (
                <button className="download-btn" onClick={handleMapExport}>
                    <IconPrinter />
                    <span>Generate Geospatial PDF</span>
                </button>
            )}
        </>
    );
};

export default ExportReporting;
