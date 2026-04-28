import React from 'react';

const RainfallExtremeRecord = ({ rainfallStats }) => {
    if (!rainfallStats.maxVillage) {
        return <div className="no-record-msg">No record available for this selection</div>;
    }

    return (
        <div className="max-record-content">
            <div className="max-record-hero">
                <div className="max-record-value">
                    <span className="max-value">{Number(rainfallStats?.max ?? 0).toFixed(1)}</span>
                    <span className="max-unit">mm</span>
                </div>
                <span className="max-label">Maximum Recorded</span>
            </div>

            <div className="max-details">
                <div className="detail-row">
                    <span className="detail-label">
                        <span className="indicator" style={{ backgroundColor: '#f43f5e' }}></span>
                        Location
                    </span>
                    <span className="detail-value">{rainfallStats.maxVillage}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">
                        <span className="indicator" style={{ backgroundColor: '#6366f1' }}></span>
                        Date
                    </span>
                    <span className="detail-value">{rainfallStats.maxDate}</span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(RainfallExtremeRecord);
