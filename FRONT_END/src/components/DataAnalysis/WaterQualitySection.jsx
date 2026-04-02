import React from 'react';
import AnalysisCard from './Common/AnalysisCard';
import MiniStatusCard from './Common/MiniStatusCard';
import ParameterGrid from './WaterQuality/ParameterGrid';
import MonsoonComparisonChart from './WaterQuality/MonsoonComparisonChart';
import ComplianceChart from './WaterQuality/ComplianceChart';
import GlassLoadingOverlay from '../Common/GlassLoadingOverlay';

const WaterQualitySection = ({
    displayRegion,
    selectedBlock,
    blockWaterQualityData,
    qualityData,
    waterQualityAvailability,
    isDatabaseData,
    isLoading,
    globalFilters,
    onFilterChange
}) => {
    if (isLoading) {
        return (
            <AnalysisCard className="animated-entry" style={{ position: 'relative', minHeight: '300px' }}>
                <GlassLoadingOverlay
                    message="Testing Water Quality"
                    subtext="Analyzing chemical exceedances and WQI"
                />
            </AnalysisCard>
        );
    }
    return (
        <>
            <div className="sidebar-section animated-entry">
                <div className="section-header-flat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <h3 style={{ margin: 0 }}>
                            Water Quality: {displayRegion || 'Rajasthan'}
                            {selectedBlock && ` - ${selectedBlock}`}
                        </h3>
                        {isDatabaseData !== undefined && (
                            <span className={`source-badge ${isDatabaseData ? 'db-source' : 'static-source'}`} style={{ margin: 0 }}>
                                {isDatabaseData ? 'Database' : 'Static Data'}
                            </span>
                        )}
                    </div>

                    <div className="wq-marker-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            id="showWQMarkers"
                            checked={globalFilters?.showMarkers ?? false}
                            onChange={(e) => onFilterChange('showMarkers', e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="showWQMarkers" style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Show Markers
                        </label>
                    </div>
                </div>
            </div>

            {
                blockWaterQualityData?.isNoData ? null : blockWaterQualityData && !Array.isArray(blockWaterQualityData) ? (
                    <>
                        <div className="water-quality-grid" style={{ marginBottom: '1.5rem' }}>
                            {blockWaterQualityData.wqi && (
                                <MiniStatusCard
                                    value={blockWaterQualityData.wqi.value}
                                    label={`WQI - ${blockWaterQualityData.wqi.classification}`}
                                    color={blockWaterQualityData.wqi.value < 100 ? '#2a9d8f' : blockWaterQualityData.wqi.value < 200 ? '#f4a261' : '#e63946'}
                                    className="wqi-status-card"
                                />
                            )}
                            {blockWaterQualityData.status && (
                                <MiniStatusCard
                                    value={blockWaterQualityData.status.text}
                                    label={blockWaterQualityData.status.issues.length > 0
                                        ? blockWaterQualityData.status.issues.join(', ')
                                        : 'All parameters within safe limits'}
                                    color={blockWaterQualityData.status.status === 'good' ? '#2a9d8f' : blockWaterQualityData.status.status === 'warning' ? '#f4a261' : '#e63946'}
                                    className="wqi-status-card"
                                />
                            )}
                        </div>

                        <ParameterGrid blockWaterQualityData={blockWaterQualityData} />

                        {waterQualityAvailability?.summary && (
                            <MonsoonComparisonChart summary={waterQualityAvailability.summary} isOverview={false} />
                        )}
                    </>
                ) : (
                    <>
                        <AnalysisCard className="animated-entry" style={{ animationDelay: '0.1s' }}>
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💧</div>
                                <h3 style={{ marginBottom: '0.5rem' }}>Select a Block/Taluka</h3>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                    Choose a specific block from the dropdown to view detailed water quality parameters
                                </p>
                            </div>
                        </AnalysisCard>

                        <AnalysisCard title="District Water Quality Compliance" className="animated-entry full-width" style={{ animationDelay: '0.2s' }}>
                            <ComplianceChart data={qualityData} />
                            <div className="quality-legend-simple">
                                <div className="legend-label">% Stations Exceeding Permissible Limits</div>
                            </div>
                        </AnalysisCard>

                        {waterQualityAvailability?.summary && (
                            <AnalysisCard title="Pre vs Post Monsoon Comparison" className="animated-entry full-width" style={{ animationDelay: '0.3s' }}>
                                <MonsoonComparisonChart summary={waterQualityAvailability.summary} isOverview={true} />
                            </AnalysisCard>
                        )}
                    </>
                )
            }
        </>
    );
};

export default WaterQualitySection;
