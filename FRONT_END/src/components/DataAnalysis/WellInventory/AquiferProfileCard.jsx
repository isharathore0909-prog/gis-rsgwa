import React from 'react';
import { WellSelectionTable } from './WellSelectionTable';

export const AquiferProfileCard = ({
    selectedFeature,
    selectedWellInventory,
    onToggleWellInventory,
    onClearWellInventory
}) => {
    const aquiferName = selectedFeature.Aquifer || selectedFeature.aquifer || 'Unknown Aquifer';
    const displayProps = Object.entries(selectedFeature).filter(([key]) =>
        !['type', 'fid', 'geom', 'geometry', '_leaflet_id'].includes(key.toLowerCase())
    );

    return (
        <div className="well-inventory-section detailed-view animated-entry">
            <div className="well-profile-card">
                <div className="profile-header">
                    <div className="profile-icon" style={{ backgroundColor: '#3b82f6' }}>🌊</div>
                    <div className="profile-info"><h4>Aquifer Details</h4><p>{aquiferName}</p></div>
                </div>
                <div className="data-table-container" style={{ marginTop: '16px' }}>
                    <div className="table-header selection-integrated"><h5>Feature Attributes</h5></div>
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
            <WellSelectionTable
                selectedWellInventory={selectedWellInventory}
                onToggleWellInventory={onToggleWellInventory}
                onClearWellInventory={onClearWellInventory}
            />
        </div>
    );
};
