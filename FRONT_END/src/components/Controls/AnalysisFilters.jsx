import React from 'react';
import { TYPE_OPTIONS, TIMESTEPS, STATION_TYPES } from '../../constants/uiOptions';

const AnalysisFilters = ({
    filters,
    handleFilterChange,
    availableBlocks,
    districts = [],
    handleProceed,
    section = 'all' // 'location', 'layers', 'time', 'all'
}) => {

    const showAll = section === 'all';

    return (
        <>
            {(showAll || section === 'layers') && (
                <div className="form-group thematic-layers">
                    <label>Layer Specification</label>
                    <select
                        className="select-input"
                        value={filters.type}
                        onChange={e => handleFilterChange('type', e.target.value)}
                    >
                        <option value="">-- No Layer Selected --</option>
                        {TYPE_OPTIONS.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            )}

            {(showAll || section === 'network') && (
                <div className="form-group">
                    <label>Monitoring Network</label>
                    <select
                        className="select-input"
                        value={filters.stationType}
                        onChange={e => handleFilterChange('stationType', e.target.value)}
                    >
                        {STATION_TYPES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            )}

            {(showAll || section === 'location') && (
                <div className="form-group area-selection">
                    <label>Selection Hierarchy</label>
                    <div className="cascading-dropdowns">
                        <div className="field-row">
                            <span className="field-label">State</span>
                            <select
                                className="select-input"
                                value="Rajasthan"
                                disabled
                            >
                                <option value="Rajasthan">Rajasthan</option>
                            </select>
                        </div>
                        <div className="field-row">
                            <span className="field-label">District</span>
                            <select
                                className="select-input"
                                value={filters.district}
                                onChange={e => handleFilterChange('district', e.target.value)}
                            >
                                <option value="">-- All Districts --</option>
                                {districts.map(d => (
                                    <option key={typeof d === 'string' ? d : d.id} value={typeof d === 'string' ? d : d.name}>
                                        {typeof d === 'string' ? d : d.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {filters.type !== 'Ground Water Resource Estimation' && (
                            <div className="field-row">
                                <span className="field-label">Block</span>
                                <select
                                    className="select-input"
                                    value={filters.block}
                                    onChange={e => handleFilterChange('block', e.target.value)}
                                    disabled={!filters.district}
                                >
                                    <option value="">-- All Blocks --</option>
                                    {availableBlocks.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {(showAll || section === 'time') && (
                <>
                    <div className="form-group">
                        <label>Temporal Resolution</label>
                        <select
                            className="select-input"
                            value={filters.timestep}
                            onChange={e => handleFilterChange('timestep', e.target.value)}
                        >
                            {TIMESTEPS.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Analysis Period</label>
                        <div className="date-inputs-horizontal">
                            <input
                                type="date"
                                className="date-input"
                                value={filters.dataRangeStart}
                                onChange={e => handleFilterChange('dataRangeStart', e.target.value)}
                            />
                            <span style={{ color: '#94a3b8' }}>-</span>
                            <input
                                type="date"
                                className="date-input"
                                value={filters.dataRangeEnd}
                                onChange={e => handleFilterChange('dataRangeEnd', e.target.value)}
                            />
                        </div>
                    </div>

                    <button className="proceed-btn" onClick={handleProceed}>
                        Execute Analysis
                    </button>
                </>
            )}
        </>
    );
};

export default AnalysisFilters;
