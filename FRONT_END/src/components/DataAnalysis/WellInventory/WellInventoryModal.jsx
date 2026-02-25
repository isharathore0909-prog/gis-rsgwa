import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const WellInventoryModal = ({
    isOpen,
    onClose,
    selectedWellInventory,
    handleBatchDownload,
    renderTableContent
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="well-inventory-modal-overlay"
            style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="well-inventory-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>Selected Locations Data</h2>
                    <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="batch-action-btn-primary"
                            onClick={handleBatchDownload}
                            disabled={selectedWellInventory.length === 0}
                            style={{
                                opacity: selectedWellInventory.length === 0 ? 0.6 : 1,
                                cursor: selectedWellInventory.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Export Data</span>
                        </button>
                        <button className="modal-close-btn" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

export default WellInventoryModal;
