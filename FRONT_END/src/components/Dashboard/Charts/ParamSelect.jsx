import React from 'react';
import { STYLES, WQ_PARAM_ENTRIES } from './waterLevelConstants';

/**
 * ParamSelect
 * A reusable <select> that lists physical groundwater metrics and water
 * quality parameters in two optgroups.  Wrapped in React.memo so it
 * only re-renders when `value` or `onChange` actually change.
 */
const ParamSelect = React.memo(({ value, onChange }) => (
    <select value={value} onChange={onChange} style={STYLES.selectStyle}>
        <optgroup label="Groundwater Physical">
            <option value="water_level">Water Level (m.bgl)</option>
            <option value="rainfall">Annual Rainfall (mm)</option>
        </optgroup>
        <optgroup label="Water Quality Analysis">
            {WQ_PARAM_ENTRIES.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
            ))}
        </optgroup>
    </select>
));

ParamSelect.displayName = 'ParamSelect';

export default ParamSelect;
