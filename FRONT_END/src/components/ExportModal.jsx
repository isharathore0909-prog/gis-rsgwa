import React from 'react';
import './ExportModal.css';
import { IconDownload, IconSettings } from './Common/Icons';

/**
 * ExportModal Component
 * 
 * Provides a premium interface for exporting observation data.
 */
const ExportModal = ({ isOpen, onClose, onExport, dataSummary, filters }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="export-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <IconDownload className="header-icon" />
                        <h2>Export Observation Data</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-content">
                    <div className="export-info-card">
                        <div className="info-row">
                            <span className="info-label">Current Layer:</span>
                            <span className="info-value">{filters?.type || 'Not Selected'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Region:</span>
                            <span className="info-value">
                                {filters?.district ? `District: ${filters.district}` : 'All Rajasthan'}
                                {filters?.block ? `, Block: ${filters.block}` : ''}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Available Records:</span>
                            <span className="info-value">{dataSummary?.totalRecords || 0}</span>
                        </div>
                        {dataSummary?.selectedCount > 0 && (
                            <div className="info-row highlighted">
                                <span className="info-label">Selected Records:</span>
                                <span className="info-value">{dataSummary.selectedCount}</span>
                            </div>
                        )}
                    </div>

                    <div className="export-options">
                        <p className="options-title">Select Format</p>
                        <div className="format-grid">
                            <div className="format-item active">
                                <div className="format-icon">CSV</div>
                                <div className="format-name">Comma Separated</div>
                            </div>
                            <div className="format-item disabled" title="Excel export coming soon">
                                <div className="format-icon">XLS</div>
                                <div className="format-name">Excel Sheet</div>
                            </div>
                            <div className="format-item disabled" title="JSON export coming soon">
                                <div className="format-icon">JSON</div>
                                <div className="format-name">JSON Format</div>
                            </div>
                        </div>
                    </div>

                    <div className="export-notice">
                        <IconSettings className="notice-icon" />
                        <p>Raw observation data will include all attributes for the current filtered area.</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="confirm-export-btn"
                        onClick={() => {
                            onExport();
                            onClose();
                        }}
                        disabled={!dataSummary?.totalRecords}
                    >
                        <IconDownload />
                        <span>Download Raw Data</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
