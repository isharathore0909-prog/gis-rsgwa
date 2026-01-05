import React from 'react';
import { IconDownload, IconPrinter } from '../Icons';

const ExportReporting = ({ handleExportData }) => {
    return (
        <>
            <button className="download-btn" onClick={handleExportData}>
                <IconDownload />
                <span>Export Raw Observation Data</span>
            </button>
            <button className="download-btn" onClick={() => window.print()}>
                <IconPrinter />
                <span>Generate Geospatial PDF</span>
            </button>
        </>
    );
};

export default ExportReporting;
