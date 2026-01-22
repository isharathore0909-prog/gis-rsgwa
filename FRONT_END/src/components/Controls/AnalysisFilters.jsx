import React, { useState } from 'react';
import { TYPE_OPTIONS, TIMESTEPS, STATION_TYPES } from '../../constants/uiOptions';

const AnalysisFilters = ({
    filters,
    handleFilterChange,
    availableBlocks,
    availableGPs = [],
    availableVillages = [],
    districts = [],
    section = 'all', // 'location', 'layers', 'time', 'all'
    onCoordinateSearch
}) => {

    const showAll = section === 'all';
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

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

                    {filters.type === 'Rainfall' && (
                        <div style={{ marginTop: '1rem' }}>
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={filters.showRaingaugeStations}
                                    onChange={e => handleFilterChange('showRaingaugeStations', e.target.checked)}
                                />
                                Raingauge Stations
                            </label>
                        </div>
                    )}

                    {filters.type === 'Water Resources' && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={filters.showDams}
                                    onChange={e => handleFilterChange('showDams', e.target.checked)}
                                />
                                Dams
                            </label>
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={filters.showCanals}
                                    onChange={e => handleFilterChange('showCanals', e.target.checked)}
                                />
                                Canals
                            </label>
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={filters.showWaterbodies}
                                    onChange={e => handleFilterChange('showWaterbodies', e.target.checked)}
                                />
                                Waterbodies
                            </label>
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={filters.showMicro}
                                    onChange={e => handleFilterChange('showMicro', e.target.checked)}
                                />
                                Micro
                            </label>
                        </div>
                    )}
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
                    <label>Search by Coordinates</label>
                    <div className="coordinate-search-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <input
                                type="number"
                                placeholder="Lat (e.g. 27.0)"
                                className="select-input"
                                value={lat}
                                onChange={e => setLat(e.target.value)}
                                style={{ width: '100%' }}
                            />
                            <input
                                type="number"
                                placeholder="Lon (e.g. 74.0)"
                                className="select-input"
                                value={lng}
                                onChange={e => setLng(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <button
                            className="analysis-btn"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                marginTop: '0.25rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                border: '1px solid #000000'
                            }}
                            onClick={() => {
                                const l = parseFloat(lat);
                                const ln = parseFloat(lng);
                                if (!isNaN(l) && !isNaN(ln) && onCoordinateSearch) {
                                    onCoordinateSearch(l, ln);
                                } else {
                                    alert("Please enter valid coordinates");
                                }
                            }}
                        >
                            Search Location
                        </button>
                    </div>
                </div>
            )}

            {(showAll || section === 'location') && (
                <div className="form-group area-selection" style={{ borderTop: '1px solid #e2e8f01a', paddingTop: '1rem', marginTop: '1rem' }}>
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

                        <div className="field-row">
                            <span className="field-label">Block</span>
                            <select
                                className="select-input"
                                value={filters.block}
                                onChange={e => handleFilterChange('block', e.target.value)}
                                disabled={!filters.district || filters.type === 'Ground Water Resource Estimation'}
                            >
                                <option value="">-- All Blocks --</option>
                                {availableBlocks.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field-row">
                            <span className="field-label">Gram Panchayat</span>
                            <select
                                className="select-input"
                                value={filters.gramPanchayat}
                                onChange={e => handleFilterChange('gramPanchayat', e.target.value)}
                                disabled={!filters.block}
                            >
                                <option value="">-- All Gram Panchayats --</option>
                                {availableGPs.map(gp => (
                                    <option key={gp} value={gp}>{gp}</option>
                                ))}
                            </select>
                        </div>
                        <div className="field-row">
                            <span className="field-label">Village</span>
                            <select
                                className="select-input"
                                value={filters.village}
                                onChange={e => handleFilterChange('village', e.target.value)}
                                disabled={!filters.block} // GP is optional but block is required
                            >
                                <option value="">-- All Villages --</option>
                                {availableVillages.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}



            {(showAll || section === 'time') && (
                <>
                    <div className="analysis-mode-card">
                        <div className="analysis-mode-title">
                            <div className="title-bar"></div>
                            ANALYSIS MODE
                        </div>
                        <div className="analysis-buttons">
                            {['Daily', 'Monthly', 'Yearly'].map(mode => (
                                <button
                                    key={mode}
                                    className={`analysis-btn ${filters.timestep === mode ? 'active' : ''}`}
                                    onClick={() => handleFilterChange('timestep', mode)}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
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
                </>
            )}
        </>
    );
};

export default AnalysisFilters;
